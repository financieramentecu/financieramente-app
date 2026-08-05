import type { LeadFunnelColumn } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { normalizeFunnelStatusKey } from '@/features/leads/lib/normalize-funnel-status-key'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

export interface AuditContext {
	userId?: number
	email?: string
	ipAddress?: string
	userAgent?: string
}

export interface CreateLeadFunnelColumnInput {
	name: string
	externalStatusKey: string
	position: number
}

export interface UpdateLeadFunnelColumnInput {
	name?: string
	position?: number
	externalStatusKey?: string
}

/**
 * Creates a `LeadFunnelColumn`. Rejects a duplicate `externalStatusKey`
 * (unique constraint enforced here to return a friendly validation error
 * before Prisma's `P2002`).
 */
export async function createLeadFunnelColumn(
	input: CreateLeadFunnelColumnInput,
	auditContext: AuditContext = {}
): Promise<ApiResponse<LeadFunnelColumn>> {
	const externalStatusKey = normalizeFunnelStatusKey(input.externalStatusKey)

	const existing = await prisma.leadFunnelColumn.findFirst({
		where: { externalStatusKey, active: true },
	})
	if (existing) {
		return {
			data: null,
			error: 'Ya existe una columna con ese externalStatusKey',
		}
	}

	const column = await prisma.leadFunnelColumn.create({
		data: {
			name: input.name,
			externalStatusKey,
			position: input.position,
		},
	})

	await logAuditEvent({
		userId: auditContext.userId,
		email: auditContext.email,
		ipAddress: auditContext.ipAddress,
		userAgent: auditContext.userAgent,
		action: AuditAction.LEAD_FUNNEL_COLUMN_CREATED,
		details: `Columna de embudo creada: ${column.name} (externalStatusKey: ${column.externalStatusKey})`,
	})

	return { data: column }
}

/**
 * Renames/reorders a `LeadFunnelColumn`. `externalStatusKey` is immutable
 * after creation — changing it would silently reroute future CRM webhooks
 * away from this column (to "Sin mapear") without moving leads already
 * assigned here, so any attempt to change it to a different value is
 * rejected. Sending back the same (normalized) value is a harmless no-op.
 */
export async function updateLeadFunnelColumn(
	idLeadFunnelColumn: number,
	input: UpdateLeadFunnelColumnInput,
	auditContext: AuditContext = {}
): Promise<ApiResponse<LeadFunnelColumn>> {
	const normalizedInput = { ...input }

	if (normalizedInput.externalStatusKey !== undefined) {
		const current = await prisma.leadFunnelColumn.findUnique({
			where: { idLeadFunnelColumn },
		})
		if (!current) {
			return { data: null, error: 'Columna no encontrada' }
		}

		const requestedKey = normalizeFunnelStatusKey(normalizedInput.externalStatusKey)
		if (requestedKey !== current.externalStatusKey) {
			return {
				data: null,
				error: 'externalStatusKey no se puede modificar después de creada',
			}
		}

		delete normalizedInput.externalStatusKey
	}

	const column = await prisma.leadFunnelColumn.update({
		where: { idLeadFunnelColumn },
		data: normalizedInput,
	})

	await logAuditEvent({
		userId: auditContext.userId,
		email: auditContext.email,
		ipAddress: auditContext.ipAddress,
		userAgent: auditContext.userAgent,
		action: AuditAction.LEAD_FUNNEL_COLUMN_UPDATED,
		details: `Columna de embudo actualizada: ${column.name} (id: ${idLeadFunnelColumn})`,
	})

	return { data: column }
}

/**
 * Soft-deletes a `LeadFunnelColumn`. Blocked when it is the fixed fallback
 * column ("Sin mapear") or when it still has active leads assigned.
 */
export async function deleteLeadFunnelColumn(
	idLeadFunnelColumn: number,
	auditContext: AuditContext = {}
): Promise<ApiResponse<{ idLeadFunnelColumn: number }>> {
	const column = await prisma.leadFunnelColumn.findUnique({
		where: { idLeadFunnelColumn },
	})

	if (!column) {
		return { data: null, error: 'Columna no encontrada' }
	}

	if (column.isFallback) {
		return {
			data: null,
			error: 'La columna "Sin mapear" no puede eliminarse',
		}
	}

	const activeLeadsCount = await prisma.lead.count({
		where: { idLeadFunnelColumn, active: true },
	})

	if (activeLeadsCount > 0) {
		return {
			data: null,
			error: `No se puede eliminar: la columna tiene ${activeLeadsCount} lead(s) activo(s)`,
		}
	}

	// `externalStatusKey` has a hard DB-level unique constraint, so a
	// soft-deleted row would otherwise keep occupying it forever, blocking
	// creation of a new column reusing the same value. Tombstone it here to
	// free it up — the row itself, and its history, are preserved.
	await prisma.leadFunnelColumn.update({
		where: { idLeadFunnelColumn },
		data: {
			active: false,
			externalStatusKey: `${column.externalStatusKey}__deleted_${idLeadFunnelColumn}`,
		},
	})

	await logAuditEvent({
		userId: auditContext.userId,
		email: auditContext.email,
		ipAddress: auditContext.ipAddress,
		userAgent: auditContext.userAgent,
		action: AuditAction.LEAD_FUNNEL_COLUMN_UPDATED,
		details: `Columna de embudo eliminada (soft delete): id ${idLeadFunnelColumn}`,
	})

	return { data: { idLeadFunnelColumn } }
}
