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
import type {
	LeadCsvImportSummary,
	LeadCsvOwnerlessLead,
} from '@/features/leads/types/lead-csv-import.types'
import {
	findPersonContactIds,
	collectPersonGroupIds,
	resolvePersonGroupOwner,
	propagatePersonGroupOwner,
	LeadPersonGroupError,
} from '@/features/leads/services/lead-person-group.service'
import {
	validateLeadCapture,
	LeadCaptureValidationError,
} from '@/features/leads/captures/lead-capture.service'

export interface LeadCsvImportActor {
	userId?: number
	manageableUserIds?: readonly number[]
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
 * Row-level tolerance: every row is processed independently. Each row has its own
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

	const activeColumns = await prisma.leadFunnelColumn.findMany({
		where: { active: true },
	})
	const activeUsers: ActiveUserForNameMatch[] = await prisma.user.findMany({
		where: { active: true },
		select: { idUser: true, name: true, lastName: true },
	})
	const seenExternalCrmIds = new Set<string>()

	const reject = async (
		rowNumber: number,
		externalCrmId: string | undefined,
		reason: string
	) => {
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

		const funnelColumnResult = resolveFunnelColumnByName(
			row.columna_funnel,
			activeColumns
		)
		if (funnelColumnResult.rejected) {
			await reject(rowNumber, row.id_externo_crm, funnelColumnResult.reason)
			continue
		}

		const outcomeStatusResult = parseLeadOutcomeStatus(row.estado)
		if (outcomeStatusResult.rejected) {
			await reject(rowNumber, row.id_externo_crm, outcomeStatusResult.reason)
			continue
		}

		try {
			const result = await prisma.$transaction(
				async (tx) => {
					const existing = await tx.lead.findUnique({
						where: { externalCrmId: row.id_externo_crm },
					})
					const emailResolvedOwnerId = await resolveOwner(
						row.propietario_correo
					)
					const ownerResolution = resolveRowOwner({
						rowNumber,
						externalCrmId: row.id_externo_crm,
						propietarioCorreo: row.propietario_correo,
						propietarioNombre: row.propietario_nombre,
						emailResolvedOwnerId,
						hasExistingOwner: Boolean(existing?.idUser),
						activeUsers,
					})
					const payload = mapCsvRowToLeadPayload(row)
					const matches = await findPersonContactIds(
						tx,
						payload,
						existing?.idLead
					)
					const ids = await collectPersonGroupIds(
						[...matches, ...(existing ? [existing.idLead] : [])],
						tx
					)
					const ownerId = await resolvePersonGroupOwner(tx, ids, {
						manageableUserIds: actor.manageableUserIds,
						...(typeof ownerResolution.resolvedOwnerId === 'number'
							? { targetOwnerId: ownerResolution.resolvedOwnerId }
							: {}),
					})
					if (
						existing?.idLeadCapture != null &&
						row.id_captura !== undefined &&
						row.id_captura !== existing.idLeadCapture
					)
						throw new Error('La captación requiere una oportunidad diferente')
					await validateLeadCapture(tx, row.id_captura, existing?.idLeadCapture)
					const { value: resolvedOutcomeStatus, locked: outcomeLocked } =
						resolveOutcomeStatus(
							outcomeStatusResult.value,
							existing?.outcomeStatus
						)
					const upsertData = buildLeadUpsertData(
						payload,
						existing ?? {},
						ownerId ?? undefined,
						resolvedOutcomeStatus
					)
					// Attribution is first observed per Lead; retries never rewrite existing values.
					if (existing?.originTag) delete upsertData.originTag
					const receivedAt = new Date()
					const lead = await tx.lead.upsert({
						where: { externalCrmId: row.id_externo_crm },
						create: {
							...upsertData,
							externalCrmId: row.id_externo_crm,
							idLeadFunnelColumn: funnelColumnResult.value.idLeadFunnelColumn,
							active: true,
							createdAt: row.fecha_creacion ?? receivedAt,
							updatedAt: receivedAt,
							idLeadCapture: row.id_captura,
							referrerName: row.referido_por || null,
						},
						update: {
							...upsertData,
							idLeadFunnelColumn: funnelColumnResult.value.idLeadFunnelColumn,
							active: true,
							updatedAt: receivedAt,
							idLeadCapture: existing?.idLeadCapture ?? row.id_captura,
							referrerName:
								existing?.referrerName || row.referido_por || undefined,
						},
					})
					if (matches.length)
						await tx.leadLink.createMany({
							data: matches.map((idRelatedLead) => ({
								idLead: lead.idLead,
								idRelatedLead,
								source: 'AUTO' as const,
								linkedBy: actor.userId ?? null,
								linkedAt: receivedAt,
							})),
							skipDuplicates: true,
						})
					const actorLabel = userLabel(activeUsers, actor.userId) ?? actor.email
					if (ownerId !== null)
						await propagatePersonGroupOwner(
							tx,
							ids,
							ownerId,
							{ source: 'MANUAL', idActor: actor.userId, actorLabel },
							receivedAt
						)
					if (
						existing?.idLeadFunnelColumn !==
						funnelColumnResult.value.idLeadFunnelColumn
					)
						await tx.leadStageHistory.create({
							data: {
								idLead: lead.idLead,
								fromIdLeadFunnelColumn: existing?.idLeadFunnelColumn ?? null,
								toIdLeadFunnelColumn:
									funnelColumnResult.value.idLeadFunnelColumn,
								source: 'CSV_IMPORT',
								idUser: actor.userId ?? null,
								changedAt: receivedAt,
							},
						})
					const changes = []
					if (ownerId !== (existing?.idUser ?? null))
						changes.push({
							idLead: lead.idLead,
							kind: 'OWNER' as const,
							source: 'MANUAL' as const,
							idActor: actor.userId ?? null,
							actorLabel,
							fromLabel: userLabel(activeUsers, existing?.idUser),
							toLabel: userLabel(activeUsers, ownerId) ?? 'Sin Money Strategy',
							changedAt: receivedAt,
						})
					const nextOrigin =
						typeof upsertData.originTag === 'string'
							? upsertData.originTag
							: null
					if (nextOrigin && nextOrigin !== (existing?.originTag ?? null))
						changes.push({
							idLead: lead.idLead,
							kind: 'ORIGIN' as const,
							source: 'MANUAL' as const,
							idActor: actor.userId ?? null,
							actorLabel,
							fromLabel: existing?.originTag ?? null,
							toLabel: nextOrigin,
							changedAt: receivedAt,
						})
					if (changes.length)
						await tx.leadChangeHistory.createMany({ data: changes })
					return {
						existing,
						outcomeLocked,
						ownerlessEntry:
							ownerId !== null &&
							ownerResolution.ownerlessEntry?.reason === 'NO_OWNER_PROVIDED'
								? undefined
								: ownerResolution.ownerlessEntry,
					}
				},
				{ isolationLevel: 'Serializable' }
			)
			const { existing, outcomeLocked, ownerlessEntry } = result

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
		} catch (cause) {
			const reason =
				cause instanceof LeadPersonGroupError ||
				cause instanceof LeadCaptureValidationError ||
				(cause instanceof Error &&
					cause.message === 'La captación requiere una oportunidad diferente')
					? cause.message
					: 'No fue posible importar la fila'
			await reject(rowNumber, row.id_externo_crm, reason)
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

function userLabel(
	users: ActiveUserForNameMatch[],
	idUser: number | null | undefined
): string | null {
	if (idUser == null) return null
	const user = users.find((candidate) => candidate.idUser === idUser)
	if (!user) return null
	const name = [user.name, user.lastName].filter(Boolean).join(' ').trim()
	return name || null
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
				ownerlessEntry: {
					rowNumber,
					externalCrmId,
					reason: 'NO_OWNER_PROVIDED',
				},
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
