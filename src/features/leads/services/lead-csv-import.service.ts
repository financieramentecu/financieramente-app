import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { buildLeadUpsertData } from '@/features/leads/lib/build-lead-upsert-data'
import { resolveOutcomeStatus } from '@/features/leads/lib/lead-outcome-status'
import { resolveOwner } from '@/features/leads/services/lead-sync.service'
import { resolveFunnelColumnByName } from '@/features/leads/lib/resolve-funnel-column-by-name'
import { parseLeadOutcomeStatus } from '@/features/leads/lib/parse-lead-outcome-status'
import { mapCsvRowToLeadPayload } from '@/features/leads/lib/map-csv-row-to-lead-payload'
import { resolveOwnerByName } from '@/features/leads/lib/resolve-owner-by-name'
import type { ActiveUserForNameMatch } from '@/features/leads/lib/resolve-owner-by-name'
import { leadCsvRowSchema } from '@/features/leads/types/lead-csv-import.schema'
import type { LeadCsvRawRow } from '@/features/leads/lib/parse-lead-csv-file'
import type { LeadCsvImportSummary, LeadCsvOwnerlessLead } from '@/features/leads/types/lead-csv-import.types'

export interface LeadCsvImportActor {
	userId?: number
	email: string
	ipAddress?: string
	userAgent?: string
}

/**
 * Row header occupies spreadsheet line 1; the first data row is line 2 —
 * `rowNumber = arrayIndex + 2`, matching the design's 1-based convention.
 */
const HEADER_ROW_OFFSET = 2

/**
 * Row loop for the CSV import path. Deliberately separate from
 * `lead-sync.service.ts`: strict resolvers (`resolveFunnelColumnByName`,
 * `parseLeadOutcomeStatus`) reject unrecognized values outright instead of
 * falling back, and `resolveOutcomeStatus` is called ONLY with an
 * already-parsed value — its `unresolved` branch is structurally
 * unreachable here.
 *
 * Row-level tolerance: every row is processed independently. There is no
 * wrapping `$transaction` — a rejected row never rolls back an earlier
 * successful upsert in the same file.
 */
export async function importLeadsFromCsv(
	rawRows: LeadCsvRawRow[],
	actor: LeadCsvImportActor
): Promise<LeadCsvImportSummary> {
	const summary: LeadCsvImportSummary = {
		totalRows: rawRows.length,
		imported: 0,
		created: 0,
		updated: 0,
		rejected: [],
		ownerlessLeads: [],
		wonLockedLeads: [],
	}

	await logAuditEvent({
		action: AuditAction.LEAD_CSV_IMPORT_STARTED,
		userId: actor.userId,
		email: actor.email,
		ipAddress: actor.ipAddress,
		userAgent: actor.userAgent,
		details: `Importación CSV de leads iniciada (${rawRows.length} filas)`,
	})

	const activeColumns = await prisma.leadFunnelColumn.findMany({ where: { active: true } })
	const activeUsers: ActiveUserForNameMatch[] = await prisma.user.findMany({
		where: { active: true },
		select: { idUser: true, name: true, lastName: true },
	})
	const seenExternalCrmIds = new Set<string>()

	const reject = async (rowNumber: number, externalCrmId: string | undefined, reason: string) => {
		summary.rejected.push({ rowNumber, externalCrmId, reason })
		await logAuditEvent({
			action: AuditAction.LEAD_CSV_ROW_REJECTED,
			userId: actor.userId,
			email: actor.email,
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			details: `Fila ${rowNumber} rechazada: ${reason}`,
		})
	}

	for (let index = 0; index < rawRows.length; index++) {
		const rowNumber = index + HEADER_ROW_OFFSET
		const rawRow = rawRows[index]

		const parsedRow = leadCsvRowSchema.safeParse(rawRow)
		if (!parsedRow.success) {
			await reject(
				rowNumber,
				rawRow.id_externo_crm || undefined,
				parsedRow.error.issues[0]?.message ?? 'Fila inválida'
			)
			continue
		}
		const row = parsedRow.data

		if (seenExternalCrmIds.has(row.id_externo_crm)) {
			await reject(
				rowNumber,
				row.id_externo_crm,
				`id_externo_crm "${row.id_externo_crm}" duplicado dentro del archivo (ya procesado en una fila anterior)`
			)
			continue
		}
		seenExternalCrmIds.add(row.id_externo_crm)

		const funnelColumnResult = resolveFunnelColumnByName(row.columna_funnel, activeColumns)
		if (funnelColumnResult.rejected) {
			await reject(rowNumber, row.id_externo_crm, funnelColumnResult.reason)
			continue
		}

		const outcomeStatusResult = parseLeadOutcomeStatus(row.estado)
		if (outcomeStatusResult.rejected) {
			await reject(rowNumber, row.id_externo_crm, outcomeStatusResult.reason)
			continue
		}

		const existing = await prisma.lead.findUnique({
			where: { externalCrmId: row.id_externo_crm },
		})

		const emailResolvedOwnerId = await resolveOwner(row.propietario_correo)
		const { resolvedOwnerId, ownerlessEntry } = resolveRowOwner({
			rowNumber,
			externalCrmId: row.id_externo_crm,
			propietarioCorreo: row.propietario_correo,
			propietarioNombre: row.propietario_nombre,
			emailResolvedOwnerId,
			hasExistingOwner: Boolean(existing?.idUser),
			activeUsers,
		})
		const {
			value: resolvedOutcomeStatus,
			locked: outcomeLocked,
		} = resolveOutcomeStatus(outcomeStatusResult.value, existing?.outcomeStatus)

		const payload = mapCsvRowToLeadPayload(row)
		const upsertData = buildLeadUpsertData(
			payload,
			existing ?? {},
			resolvedOwnerId,
			resolvedOutcomeStatus
		)

		const receivedAt = new Date()
		await prisma.lead.upsert({
			where: { externalCrmId: row.id_externo_crm },
			create: {
				...upsertData,
				externalCrmId: row.id_externo_crm,
				idLeadFunnelColumn: funnelColumnResult.value.idLeadFunnelColumn,
				active: true,
				createdAt: row.fecha_creacion ?? receivedAt,
				updatedAt: receivedAt,
			},
			update: {
				...upsertData,
				idLeadFunnelColumn: funnelColumnResult.value.idLeadFunnelColumn,
				active: true,
				updatedAt: receivedAt,
			},
		})

		summary.imported += 1
		if (existing) {
			summary.updated += 1
		} else {
			summary.created += 1
		}

		if (ownerlessEntry) {
			summary.ownerlessLeads.push(ownerlessEntry)
		}

		if (outcomeLocked) {
			summary.wonLockedLeads.push({
				rowNumber,
				externalCrmId: row.id_externo_crm,
				attemptedStatus: outcomeStatusResult.value,
			})
		}
	}

	await logAuditEvent({
		action: AuditAction.LEAD_CSV_IMPORT_COMPLETED,
		userId: actor.userId,
		email: actor.email,
		ipAddress: actor.ipAddress,
		userAgent: actor.userAgent,
		details: `Importación CSV completada: ${summary.imported} importadas, ${summary.rejected.length} rechazadas`,
	})

	return summary
}

interface ResolveRowOwnerParams {
	rowNumber: number
	externalCrmId: string
	propietarioCorreo: string | undefined
	propietarioNombre: string | undefined
	/** `undefined` preserve, `null` cleared (present-unmatched), `number` matched. */
	emailResolvedOwnerId: number | null | undefined
	hasExistingOwner: boolean
	activeUsers: readonly ActiveUserForNameMatch[]
}

interface ResolveRowOwnerResult {
	resolvedOwnerId: number | null | undefined
	ownerlessEntry: LeadCsvOwnerlessLead | undefined
}

/**
 * Owner resolution order per design Amendment A: `propietario_correo`
 * (unchanged `resolveOwner`) wins outright; `propietario_nombre` is
 * consulted ONLY when the email result is not a matched number. A name
 * match overrides a failed email result; a name miss/ambiguity NEVER clears
 * an already-resolved (or preserved) owner — it only reports why.
 */
function resolveRowOwner(params: ResolveRowOwnerParams): ResolveRowOwnerResult {
	const {
		rowNumber,
		externalCrmId,
		propietarioCorreo,
		propietarioNombre,
		emailResolvedOwnerId,
		hasExistingOwner,
		activeUsers,
	} = params

	if (typeof emailResolvedOwnerId === 'number') {
		return { resolvedOwnerId: emailResolvedOwnerId, ownerlessEntry: undefined }
	}

	const nameValue = propietarioNombre?.trim() ?? ''

	if (nameValue === '') {
		if (emailResolvedOwnerId === null) {
			return {
				resolvedOwnerId: emailResolvedOwnerId,
				ownerlessEntry: {
					rowNumber,
					externalCrmId,
					reason: 'EMAIL_UNMATCHED',
					ownerEmail: propietarioCorreo,
				},
			}
		}
		if (!hasExistingOwner) {
			return {
				resolvedOwnerId: emailResolvedOwnerId,
				ownerlessEntry: { rowNumber, externalCrmId, reason: 'NO_OWNER_PROVIDED' },
			}
		}
		return { resolvedOwnerId: emailResolvedOwnerId, ownerlessEntry: undefined }
	}

	const nameResult = resolveOwnerByName(nameValue, activeUsers)

	if (nameResult.status === 'matched') {
		return { resolvedOwnerId: nameResult.idUser, ownerlessEntry: undefined }
	}

	if (nameResult.status === 'ambiguous') {
		return {
			resolvedOwnerId: emailResolvedOwnerId,
			ownerlessEntry: {
				rowNumber,
				externalCrmId,
				reason: 'NAME_AMBIGUOUS',
				ownerName: nameValue,
				candidateCount: nameResult.candidateCount,
			},
		}
	}

	return {
		resolvedOwnerId: emailResolvedOwnerId,
		ownerlessEntry: {
			rowNumber,
			externalCrmId,
			reason: 'NAME_UNMATCHED',
			ownerName: nameValue,
		},
	}
}
