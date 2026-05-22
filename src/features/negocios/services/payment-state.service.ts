import { AnnualPaymentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
	AuditAction,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import type { PaymentInstallmentDto } from '../types/business-api.types'

export type Actor = {
	userId: number
	email: string
	ip: string
	ua: string
}

export type TransitionResult =
	| { ok: true; payment: PaymentInstallmentDto }
	| { ok: false; code: 'NOT_FOUND' | 'CONFLICT' }

function toDto(p: {
	installmentIndex: number
	status: string
	dateAnchored: Date | null
	expectedDate: Date | null
	portfolioDate: Date | null
	earlyPaymentDate: Date | null
}): PaymentInstallmentDto {
	return {
		installmentIndex: p.installmentIndex,
		status: p.status as PaymentInstallmentDto['status'],
		dateAnchored: p.dateAnchored?.toISOString() ?? null,
		expectedDate: p.expectedDate?.toISOString() ?? null,
		portfolioDate: p.portfolioDate?.toISOString() ?? null,
		earlyPaymentDate: p.earlyPaymentDate?.toISOString() ?? null,
	}
}

export async function markCartera(
	businessId: number,
	index: number,
	actor: Actor
): Promise<TransitionResult> {
	const now = new Date()

	const result = await prisma.payment.updateMany({
		where: {
			idBusiness: businessId,
			installmentIndex: index,
			status: AnnualPaymentStatus.FONDEADO,
		},
		data: {
			status: AnnualPaymentStatus.EN_CARTERA,
			portfolioDate: now,
		},
	})

	if (result.count === 0) {
		const exists = await prisma.payment.findUnique({
			where: {
				idBusiness_installmentIndex: {
					idBusiness: businessId,
					installmentIndex: index,
				},
			},
		})
		return { ok: false, code: exists ? 'CONFLICT' : 'NOT_FOUND' }
	}

	const payment = await prisma.payment.findUnique({
		where: {
			idBusiness_installmentIndex: {
				idBusiness: businessId,
				installmentIndex: index,
			},
		},
	})

	void logAuditEvent({
		userId: actor.userId,
		action: AuditAction.APORTE_CARTERA_MARKED,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Aporte ${index} del negocio ${businessId} marcado como EN_CARTERA`,
	})

	return { ok: true, payment: toDto(payment!) }
}

export async function unmarkCartera(
	businessId: number,
	index: number,
	actor: Actor
): Promise<TransitionResult> {
	const result = await prisma.payment.updateMany({
		where: {
			idBusiness: businessId,
			installmentIndex: index,
			status: AnnualPaymentStatus.EN_CARTERA,
		},
		data: {
			status: AnnualPaymentStatus.FONDEADO,
			portfolioDate: null,
		},
	})

	if (result.count === 0) {
		const exists = await prisma.payment.findUnique({
			where: {
				idBusiness_installmentIndex: {
					idBusiness: businessId,
					installmentIndex: index,
				},
			},
		})
		return { ok: false, code: exists ? 'CONFLICT' : 'NOT_FOUND' }
	}

	const payment = await prisma.payment.findUnique({
		where: {
			idBusiness_installmentIndex: {
				idBusiness: businessId,
				installmentIndex: index,
			},
		},
	})

	void logAuditEvent({
		userId: actor.userId,
		action: AuditAction.APORTE_CARTERA_UNMARKED,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Aporte ${index} del negocio ${businessId} revertido a FONDEADO (cartera quitada)`,
	})

	return { ok: true, payment: toDto(payment!) }
}

export async function markPagoAnticipado(
	businessId: number,
	index: number,
	actor: Actor
): Promise<TransitionResult> {
	const now = new Date()

	const result = await prisma.payment.updateMany({
		where: {
			idBusiness: businessId,
			installmentIndex: index,
			status: AnnualPaymentStatus.FONDEADO,
		},
		data: {
			status: AnnualPaymentStatus.PAGO_ANTICIPADO,
			earlyPaymentDate: now,
		},
	})

	if (result.count === 0) {
		const exists = await prisma.payment.findUnique({
			where: {
				idBusiness_installmentIndex: {
					idBusiness: businessId,
					installmentIndex: index,
				},
			},
		})
		return { ok: false, code: exists ? 'CONFLICT' : 'NOT_FOUND' }
	}

	const payment = await prisma.payment.findUnique({
		where: {
			idBusiness_installmentIndex: {
				idBusiness: businessId,
				installmentIndex: index,
			},
		},
	})

	void logAuditEvent({
		userId: actor.userId,
		action: AuditAction.APORTE_PAGO_ANTICIPADO_MARKED,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Aporte ${index} del negocio ${businessId} marcado como PAGO_ANTICIPADO`,
	})

	return { ok: true, payment: toDto(payment!) }
}
