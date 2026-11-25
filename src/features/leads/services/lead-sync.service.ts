import { Prisma, type Lead, type LeadFunnelColumn } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { buildLeadUpsertData } from '@/features/leads/lib/build-lead-upsert-data'
import { resolveOutcomeStatus } from '@/features/leads/lib/lead-outcome-status'
import { normalizeFunnelStatusKey } from '@/features/leads/lib/normalize-funnel-status-key'
import type { LeadWritePayload } from '@/features/leads/types/crm-sync.schema'
import { escapeLikePattern } from '@/features/leads/lib/escape-like-pattern'
import {
	assignLeadOrigin,
	resolveLeadOrigin,
} from '@/features/leads/services/lead-origin.service'
import {
	LeadPersonGroupError,
	collectPersonGroupIds,
	findPersonContactIds,
	resolvePersonGroupOwner,
	propagatePersonGroupOwner,
} from '@/features/leads/services/lead-person-group.service'
import {
	validateLeadCapture,
	LeadCaptureValidationError,
} from '@/features/leads/captures/lead-capture.service'

const FALLBACK_STATUS_KEY = '__unmapped__'

/**
 * Resolves the target `LeadFunnelColumn` for an incoming `statusKey`.
 * Falls back to the fixed "Sin mapear" column when no mapping exists.
 */
export async function resolveFunnelColumn(
	statusKey: string,
	client: Pick<Prisma.TransactionClient, 'leadFunnelColumn'> = prisma
): Promise<LeadFunnelColumn> {
	const matched = await client.leadFunnelColumn.findFirst({
		where: {
			externalStatusKey: normalizeFunnelStatusKey(statusKey),
			active: true,
		},
	})
	if (matched) return matched

	const fallback = await client.leadFunnelColumn.findFirst({
		where: { externalStatusKey: FALLBACK_STATUS_KEY },
	})
	if (!fallback) {
		throw new Error(
			'La columna de embudo "Sin mapear" no está sembrada en la base de datos'
		)
	}
	return fallback
}

/** Resolve a trusted incoming owner; unmatched addresses never clear a known group owner. */
export async function resolveOwner(
	ownerEmail: string | undefined,
	client: Pick<Prisma.TransactionClient, 'user'> = prisma
): Promise<number | null | undefined> {
	if (!ownerEmail || ownerEmail.trim() === '') {
		return undefined
	}

	// Emails are conventionally case-insensitive; without `mode: 'insensitive'`
	// (+ trim) a CRM sending a different casing/whitespace than the stored
	// `User.email` would silently fail to match, leaving the lead owner-less.
	const user = await client.user.findFirst({
		where: {
			email: {
				equals: escapeLikePattern(ownerEmail.trim()),
				mode: 'insensitive',
			},
			active: true,
		},
		select: { idUser: true },
	})

	return user ? user.idUser : null
}

export interface UpsertLeadOriginResult {
	code: string
	name: string
}

export interface UpsertLeadFromCrmResult {
	idLead: number
	created: boolean
	origin: UpsertLeadOriginResult | null
}

/**
 * Upserts a `Lead` from a CRM sync webhook payload. Idempotency comes solely
 * from the `externalCrmId` unique upsert — no separate event table.
 */
export async function upsertLeadFromCrm(
	payload: LeadWritePayload
): Promise<UpsertLeadFromCrmResult> {
	const result = await prisma
		.$transaction(
			async (tx) => {
				const existing = await tx.lead.findUnique({
					where: { externalCrmId: payload.externalCrmId },
				})
				if (
					existing?.idLeadCapture != null &&
					payload.idLeadCapture != null &&
					existing.idLeadCapture !== payload.idLeadCapture
				) {
					throw new LeadCaptureValidationError()
				}
				await validateLeadCapture(
					tx,
					payload.idLeadCapture,
					existing?.idLeadCapture
				)
				const [funnelColumn, resolvedOwnerId, origin] = await Promise.all([
					resolveFunnelColumn(payload.statusKey, tx),
					resolveOwner(payload.ownerEmail, tx),
					resolveLeadOrigin(payload.utm_source, tx),
				])
				const {
					value: resolvedOutcomeStatus,
					unresolved: outcomeUnresolved,
					locked: outcomeLocked,
				} = resolveOutcomeStatus(payload.outcomeStatus, existing?.outcomeStatus)
				const matches = await findPersonContactIds(
					tx,
					payload,
					existing?.idLead
				)
				const data = buildLeadUpsertData(
					origin.status === 'ready'
						? { ...payload, originTag: origin.name }
						: payload,
					existing ?? {},
					undefined,
					resolvedOutcomeStatus
				)
				const receivedAt = new Date()
				const changedAt = payload.updatedAt ?? receivedAt
				const lead: Lead = await tx.lead.upsert({
					where: { externalCrmId: payload.externalCrmId },
					create: {
						...data,
						externalCrmId: payload.externalCrmId,
						idLeadFunnelColumn: funnelColumn.idLeadFunnelColumn,
						active: true,
						createdAt: payload.createdAt ?? receivedAt,
						updatedAt: changedAt,
					},
					update: {
						...data,
						idLeadFunnelColumn: funnelColumn.idLeadFunnelColumn,
						active: true,
						updatedAt: changedAt,
					},
				})
				const currentGroup = await collectPersonGroupIds([lead.idLead], tx)
				const groupIds = await collectPersonGroupIds(
					[...currentGroup, ...matches],
					tx
				)
				const ownerToStore = await resolvePersonGroupOwner(tx, groupIds, {
					manageableUserIds: [],
					...(typeof resolvedOwnerId === 'number'
						? { targetOwnerId: resolvedOwnerId }
						: {}),
				})
				if (ownerToStore !== null)
					await propagatePersonGroupOwner(
						tx,
						groupIds,
						ownerToStore,
						{ source: 'SYSTEM' },
						changedAt
					)
				const joined = groupIds.filter((id) => !currentGroup.includes(id))
				for (const idRelatedLead of joined) {
					const link = {
						idLead: lead.idLead,
						idRelatedLead,
						idClientOrigin:
							origin.status === 'ready' ? origin.idClientOrigin : null,
						source: 'AUTO' as const,
						active: true,
						linkedAt: changedAt,
					}
					await tx.leadLink.upsert({
						where: {
							idLead_idRelatedLead: { idLead: lead.idLead, idRelatedLead },
						},
						create: link,
						update: { active: true, linkedAt: changedAt },
					})
				}
				if (
					!existing ||
					existing.idLeadFunnelColumn !== funnelColumn.idLeadFunnelColumn
				) {
					await tx.leadStageHistory.create({
						data: {
							idLead: lead.idLead,
							fromIdLeadFunnelColumn: existing?.idLeadFunnelColumn ?? null,
							toIdLeadFunnelColumn: funnelColumn.idLeadFunnelColumn,
							source: 'CRM_SYNC',
							changedAt,
						},
					})
				}
				const assignment =
					origin.status === 'ready'
						? await assignLeadOrigin(
								{
									idLead: lead.idLead,
									idClientOrigin: origin.idClientOrigin,
									seenAt: changedAt,
								},
								tx
							)
						: null
				if (origin.status === 'ready' && assignment !== 'refreshed') {
					await tx.leadChangeHistory.createMany({
						data: [
							{
								idLead: lead.idLead,
								kind: 'ORIGIN',
								source: 'SYSTEM',
								fromLabel: existing?.originTag ?? null,
								toLabel: origin.name,
								changedAt,
							},
						],
					})
				}
				return {
					existing,
					lead,
					created: existing === null,
					wasInactive: existing?.active === false,
					origin,
					assignment,
					ownerToStore,
					resolvedOwnerId,
					resolvedOutcomeStatus,
					outcomeUnresolved,
					outcomeLocked,
					joined,
				}
			},
			{ isolationLevel: 'Serializable' }
		)
		.catch((cause: unknown) => {
			if (
				cause instanceof Prisma.PrismaClientKnownRequestError &&
				cause.code === 'P2034'
			)
				throw new LeadPersonGroupError()
			throw cause
		})
	const {
		existing,
		lead,
		created,
		wasInactive,
		origin,
		assignment,
		ownerToStore,
		resolvedOutcomeStatus,
		outcomeUnresolved,
		outcomeLocked,
	} = result
	if (result.joined.length > 0) {
		await logAuditEvent({
			action: AuditAction.LEAD_RELATED,
			email: 'crm-sync@system',
			details: `Lead ${lead.idLead} relacionado automáticamente con ${result.joined.length} registros de la misma persona`,
		})
	}

	await logAuditEvent({
		action: created
			? AuditAction.LEAD_CREATED
			: AuditAction.LEAD_STATUS_CHANGED,
		email: 'crm-sync@system',
		details: `Lead ${created ? 'creado' : 'actualizado'} vía webhook CRM (externalCrmId: ${payload.externalCrmId}, statusKey: ${payload.statusKey})`,
	})

	if (result.resolvedOwnerId !== undefined) {
		if (ownerToStore === null) {
			await logAuditEvent({
				action: AuditAction.LEAD_OWNER_UNRESOLVED,
				email: 'crm-sync@system',
				details: `ownerEmail no coincide con ningún usuario activo (lead externalCrmId: ${payload.externalCrmId}, ownerEmail: ${payload.ownerEmail})`,
			})
		} else {
			await logAuditEvent({
				action: AuditAction.LEAD_OWNER_ASSIGNED,
				email: 'crm-sync@system',
				details: `Propietario asignado/reasignado (lead externalCrmId: ${payload.externalCrmId}, idUser: ${ownerToStore})`,
			})
		}
	}

	if (
		resolvedOutcomeStatus !== undefined &&
		resolvedOutcomeStatus !== existing?.outcomeStatus
	) {
		await logAuditEvent({
			action: AuditAction.LEAD_OUTCOME_STATUS_CHANGED,
			email: 'crm-sync@system',
			details: `outcomeStatus actualizado a ${resolvedOutcomeStatus} (lead externalCrmId: ${payload.externalCrmId})`,
		})
	}

	if (outcomeUnresolved) {
		await logAuditEvent({
			action: AuditAction.LEAD_OUTCOME_STATUS_UNRESOLVED,
			email: 'crm-sync@system',
			details: `outcomeStatus no reconocido, normalizado a OPEN (lead externalCrmId: ${payload.externalCrmId}, valor recibido: ${payload.outcomeStatus})`,
		})
	}

	if (outcomeLocked) {
		await logAuditEvent({
			action: AuditAction.LEAD_OUTCOME_STATUS_LOCKED,
			email: 'crm-sync@system',
			details: `Intento de cambiar outcomeStatus de un lead ya WON descartado (lead externalCrmId: ${payload.externalCrmId}, valor recibido: ${payload.outcomeStatus})`,
		})
	}

	if (wasInactive) {
		await logAuditEvent({
			action: AuditAction.LEAD_REACTIVATED,
			email: 'crm-sync@system',
			details: `Lead reactivado por resync CRM (externalCrmId: ${payload.externalCrmId})`,
		})
	}

	if (origin.status === 'inactive') {
		await logAuditEvent({
			action: AuditAction.LEAD_ORIGIN_INACTIVE,
			email: 'crm-sync@system',
			details: `utm_source coincide con un origen inactivo y no se etiqueta (lead externalCrmId: ${payload.externalCrmId}, code: ${origin.code})`,
		})
		return { idLead: lead.idLead, created, origin: null }
	}

	if (origin.status !== 'ready') {
		return { idLead: lead.idLead, created, origin: null }
	}

	if (origin.createdCatalog) {
		await logAuditEvent({
			action: AuditAction.LEAD_ORIGIN_CREATED,
			email: 'crm-sync@system',
			details: `Origen de lead creado desde utm_source (code: ${origin.code}, name: ${origin.name})`,
		})
	}

	if (assignment !== 'refreshed') {
		await logAuditEvent({
			action: AuditAction.LEAD_ORIGIN_ASSIGNED,
			email: 'crm-sync@system',
			details: `Origen ${origin.code} ${assignment === 'created' ? 'asignado' : 'reactivado'} al lead (externalCrmId: ${payload.externalCrmId})`,
		})
	}

	return {
		idLead: lead.idLead,
		created,
		origin: { code: origin.code, name: origin.name },
	}
}
