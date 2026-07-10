/**
 * Servicio de servidor para editar Business.dateAnchored (fecha de fondeo)
 * y validar la existencia de soportes antes de fondear.
 *
 * Mantiene el Prisma call fuera de las rutas HTTP y de business.service.ts
 * (que es un wrapper de `fetch` consumido también en el cliente y no puede
 * importar Prisma).
 */

import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import { businessWithRelations } from '@/features/negocios/types/business-prisma.types'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import type { BusinessEntity } from '@/features/negocios/types/business-entity.types'

export type Actor = {
	userId: number | undefined
	email: string
	ip: string
	ua: string
}

export type UpdateDateAnchoredResult =
	| { ok: true; business: BusinessEntity }
	| { ok: false; code: 'NOT_FOUND' }

export type AssertHasSupportsResult =
	| { ok: true }
	| { ok: false; code: 'NO_SUPPORTS' }

/**
 * Updates `Business.dateAnchored` and syncs `Payment.dateAnchored` for the
 * first installment (`installmentIndex === 1`) in a single transaction.
 * Businesses without a Payment[1] row (HU3, no-annuity funding) simply get a
 * 0-row `updateMany` — no error path.
 */
export async function updateBusinessDateAnchored(
	businessId: number,
	actor: Actor,
	dateAnchored: Date
): Promise<UpdateDateAnchoredResult> {
	const existing = await prisma.business.findUnique({
		where: { idBusiness: businessId },
	})

	if (!existing) {
		return { ok: false, code: 'NOT_FOUND' }
	}

	const updatedBusiness = await prisma.$transaction(async (tx) => {
		await tx.payment.updateMany({
			where: { idBusiness: businessId, installmentIndex: 1 },
			data: { dateAnchored },
		})

		return tx.business.update({
			where: { idBusiness: businessId },
			data: { dateAnchored },
			include: businessWithRelations,
		})
	})

	await logAuditEvent({
		userId: actor.userId,
		action: AuditAction.BUSINESS_DATE_ANCHORED_UPDATED,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Fecha de fondeo del negocio ${businessId} actualizada a ${dateAnchored
			.toISOString()
			.slice(0, 10)}`,
	})

	return { ok: true, business: prismaBusinessToEntity(updatedBusiness) }
}

/**
 * Guard used by the funding endpoints (/fondear and /fondear-aportes) to
 * block the funding action when the business has zero ACTIVE supports
 * (`status: true`). Deactivated (soft-deleted) supports never satisfy this
 * gate.
 */
export async function assertHasSupports(
	businessId: number
): Promise<AssertHasSupportsResult> {
	const count = await prisma.businessSupport.count({
		where: { businessId, status: true },
	})

	if (count === 0) {
		return { ok: false, code: 'NO_SUPPORTS' }
	}

	return { ok: true }
}
