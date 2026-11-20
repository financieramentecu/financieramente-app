import type { Lead, LeadFunnelColumn, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
	logAuditEvent,
	AuditAction,
} from '@/features/auth/lib/audit-logger'
import { buildLeadUpsertData } from '@/features/leads/lib/build-lead-upsert-data'
import { resolveOutcomeStatus } from '@/features/leads/lib/lead-outcome-status'
import { normalizeFunnelStatusKey } from '@/features/leads/lib/normalize-funnel-status-key'
import { escapeLikePattern } from '@/features/leads/lib/escape-like-pattern'
import type { CrmSyncPayload } from '@/features/leads/types/crm-sync.schema'
import { recordLeadStageChange } from '@/features/leads/services/lead-stage-history.service'
import {
	assignLeadOrigin,
	resolveLeadOrigin,
} from '@/features/leads/services/lead-origin.service'

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
		where: { externalStatusKey: normalizeFunnelStatusKey(statusKey), active: true },
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

/**
 * Resolves `ownerEmail` to a `User.idUser`. No sticky owner: every payload
 * with a present, non-empty `ownerEmail` re-resolves and MUST overwrite the
 * current owner, matched or not.
 *
 * @returns `undefined` when `ownerEmail` is absent/empty (preserve current
 * owner); `null` when present but unmatched (clear owner); a number when
 * resolved.
 */
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
			email: { equals: escapeLikePattern(ownerEmail.trim()), mode: 'insensitive' },
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
	payload: CrmSyncPayload
): Promise<UpsertLeadFromCrmResult> {
	const existing = await prisma.lead.findUnique({
		where: { externalCrmId: payload.externalCrmId },
	})

	const [funnelColumn, resolvedOwnerId, origin] = await Promise.all([
		resolveFunnelColumn(payload.statusKey),
		resolveOwner(payload.ownerEmail),
		resolveLeadOrigin(payload.utm_source),
	])
	const {
		value: resolvedOutcomeStatus,
		unresolved: outcomeUnresolved,
		locked: outcomeLocked,
	} = resolveOutcomeStatus(payload.outcomeStatus, existing?.outcomeStatus)
	const payloadForMerge =
		origin.status === 'ready' ? { ...payload, originTag: origin.name } : payload

	const upsertData = buildLeadUpsertData(
		payloadForMerge,
		existing ?? {},
		resolvedOwnerId,
		resolvedOutcomeStatus
	)

	// Single shared instant so a create never records `createdAt` and
	// `updatedAt` microseconds apart (design D2a). Captured before the
	// upsert since the write destroys the pre-upsert `active` evidence.
	const receivedAt = new Date()
	const wasInactive = existing?.active === false

	const lead: Lead = await prisma.lead.upsert({
		where: { externalCrmId: payload.externalCrmId },
		create: {
			...upsertData,
			externalCrmId: payload.externalCrmId,
			idLeadFunnelColumn: funnelColumn.idLeadFunnelColumn,
			active: true,
			createdAt: payload.createdAt ?? receivedAt,
			updatedAt: payload.updatedAt ?? receivedAt,
		},
		update: {
			...upsertData,
			idLeadFunnelColumn: funnelColumn.idLeadFunnelColumn,
			active: true,
			updatedAt: payload.updatedAt ?? receivedAt,
		},
	})

	const created = !existing

	await recordLeadStageChange({
		idLead: lead.idLead,
		fromIdLeadFunnelColumn: existing?.idLeadFunnelColumn,
		toIdLeadFunnelColumn: funnelColumn.idLeadFunnelColumn,
		source: 'CRM_SYNC',
		changedAt: payload.updatedAt ?? receivedAt,
	})

	await logAuditEvent({
		action: created ? AuditAction.LEAD_CREATED : AuditAction.LEAD_STATUS_CHANGED,
		email: 'crm-sync@system',
		details: `Lead ${created ? 'creado' : 'actualizado'} vía webhook CRM (externalCrmId: ${payload.externalCrmId}, statusKey: ${payload.statusKey})`,
	})

	if (resolvedOwnerId !== undefined) {
		if (resolvedOwnerId === null) {
			await logAuditEvent({
				action: AuditAction.LEAD_OWNER_UNRESOLVED,
				email: 'crm-sync@system',
				details: `ownerEmail no coincide con ningún usuario activo (lead externalCrmId: ${payload.externalCrmId}, ownerEmail: ${payload.ownerEmail})`,
			})
		} else {
			await logAuditEvent({
				action: AuditAction.LEAD_OWNER_ASSIGNED,
				email: 'crm-sync@system',
				details: `Propietario asignado/reasignado (lead externalCrmId: ${payload.externalCrmId}, idUser: ${resolvedOwnerId})`,
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

	const seenAt = payload.updatedAt ?? receivedAt
	const assignment = await assignLeadOrigin({
		idLead: lead.idLead,
		idLeadOrigin: origin.idLeadOrigin,
		seenAt,
	})

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
