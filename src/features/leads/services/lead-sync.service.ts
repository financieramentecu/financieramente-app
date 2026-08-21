import type { Lead, LeadFunnelColumn } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
	logAuditEvent,
	AuditAction,
} from '@/features/auth/lib/audit-logger'
import { buildLeadUpsertData } from '@/features/leads/lib/build-lead-upsert-data'
import { resolveOutcomeStatus } from '@/features/leads/lib/lead-outcome-status'
import { normalizeFunnelStatusKey } from '@/features/leads/lib/normalize-funnel-status-key'
import type { CrmSyncPayload } from '@/features/leads/types/crm-sync.schema'

const FALLBACK_STATUS_KEY = '__unmapped__'

/**
 * Resolves the target `LeadFunnelColumn` for an incoming `statusKey`.
 * Falls back to the fixed "Sin mapear" column when no mapping exists.
 */
export async function resolveFunnelColumn(
	statusKey: string
): Promise<LeadFunnelColumn> {
	const matched = await prisma.leadFunnelColumn.findFirst({
		where: { externalStatusKey: normalizeFunnelStatusKey(statusKey), active: true },
	})
	if (matched) return matched

	const fallback = await prisma.leadFunnelColumn.findFirst({
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
	ownerEmail: string | undefined
): Promise<number | null | undefined> {
	if (!ownerEmail || ownerEmail.trim() === '') {
		return undefined
	}

	// Emails are conventionally case-insensitive; without `mode: 'insensitive'`
	// (+ trim) a CRM sending a different casing/whitespace than the stored
	// `User.email` would silently fail to match, leaving the lead owner-less.
	const user = await prisma.user.findFirst({
		where: {
			email: { equals: ownerEmail.trim(), mode: 'insensitive' },
			active: true,
		},
		select: { idUser: true },
	})

	return user ? user.idUser : null
}

export interface UpsertLeadFromCrmResult {
	idLead: number
	created: boolean
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

	const funnelColumn = await resolveFunnelColumn(payload.statusKey)
	const resolvedOwnerId = await resolveOwner(payload.ownerEmail)
	const {
		value: resolvedOutcomeStatus,
		unresolved: outcomeUnresolved,
		locked: outcomeLocked,
	} = resolveOutcomeStatus(payload.outcomeStatus, existing?.outcomeStatus)

	const upsertData = buildLeadUpsertData(
		payload,
		existing ?? {},
		resolvedOwnerId,
		resolvedOutcomeStatus
	)

	const lead: Lead = await prisma.lead.upsert({
		where: { externalCrmId: payload.externalCrmId },
		create: {
			...upsertData,
			externalCrmId: payload.externalCrmId,
			idLeadFunnelColumn: funnelColumn.idLeadFunnelColumn,
		},
		update: {
			...upsertData,
			idLeadFunnelColumn: funnelColumn.idLeadFunnelColumn,
		},
	})

	const created = !existing

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

	return { idLead: lead.idLead, created }
}
