import { AnnualPaymentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
	AuditAction,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import type { PaymentInstallmentDto } from '../types/business-api.types'

export type Actor = {
	userId: number | undefined
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
	portfolioPaymentDate?: Date | null
}): PaymentInstallmentDto {
	return {
		installmentIndex: p.installmentIndex,
		status: p.status as PaymentInstallmentDto['status'],
		dateAnchored: p.dateAnchored?.toISOString() ?? null,
		expectedDate: p.expectedDate?.toISOString() ?? null,
		portfolioDate: p.portfolioDate?.toISOString() ?? null,
		earlyPaymentDate: p.earlyPaymentDate?.toISOString() ?? null,
		portfolioPaymentDate: p.portfolioPaymentDate?.toISOString() ?? null,
	}
}

export async function markPrimerPagoFondeado(
	businessId: number,
	index: number,
	actor: Actor,
	fondeoDate: Date
): Promise<TransitionResult> {
	const existing = await prisma.business.findUnique({
		where: { idBusiness: businessId },
	})

	if (!existing) return { ok: false, code: 'NOT_FOUND' }
	if (existing.status !== 'EMITIDO') return { ok: false, code: 'CONFLICT' }

	const payment = await prisma.$transaction(async (tx) => {
		await tx.business.update({
			where: { idBusiness: businessId },
			data: {
				status: 'FONDEADO',
				dateAnchored: fondeoDate,
			},
		})

		await tx.payment.updateMany({
			where: {
				idBusiness: businessId,
				installmentIndex: index,
			},
			data: {
				dateAnchored: fondeoDate,
			},
		})

		return tx.payment.findUnique({
			where: {
				idBusiness_installmentIndex: {
					idBusiness: businessId,
					installmentIndex: index,
				},
			},
		})
	})

	void logAuditEvent({
		userId: actor.userId,
		action: AuditAction.APORTE_PRIMER_PAGO_FONDEADO,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Primer pago del negocio ${businessId} fondeado con fecha ${fondeoDate.toISOString().slice(0, 10)}`,
	})

	return { ok: true, payment: toDto(payment!) }
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

export async function markCarteraPagado(
	businessId: number,
	index: number,
	actor: Actor,
	paymentDate: Date
): Promise<TransitionResult> {
	const existingPayment = await prisma.payment.findUnique({
		where: { idBusiness_installmentIndex: { idBusiness: businessId, installmentIndex: index } },
	})
	if (!existingPayment) return { ok: false, code: 'NOT_FOUND' }
	if (existingPayment.status !== AnnualPaymentStatus.EN_CARTERA) return { ok: false, code: 'CONFLICT' }

	const isFirstPayment = index === 1
	let shouldFondearBusiness = false
	if (isFirstPayment) {
		const biz = await prisma.business.findUnique({ where: { idBusiness: businessId } })
		shouldFondearBusiness = biz?.status === 'EMITIDO'
	}

	const payment = await prisma.$transaction(async (tx) => {
		await tx.payment.updateMany({
			where: { idBusiness: businessId, installmentIndex: index, status: AnnualPaymentStatus.EN_CARTERA },
			data: { status: AnnualPaymentStatus.CARTERA_PAGADO, portfolioPaymentDate: paymentDate },
		})

		if (shouldFondearBusiness) {
			await tx.business.update({
				where: { idBusiness: businessId },
				data: { status: 'FONDEADO', dateAnchored: paymentDate },
			})
		}

		return tx.payment.findUnique({
			where: { idBusiness_installmentIndex: { idBusiness: businessId, installmentIndex: index } },
		})
	})

	void logAuditEvent({
		userId: actor.userId,
		action: AuditAction.APORTE_CARTERA_PAGADO,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Aporte ${index} del negocio ${businessId} marcado como CARTERA_PAGADO con fecha ${paymentDate.toISOString().slice(0, 10)}${shouldFondearBusiness ? ' — negocio fondeado' : ''}`,
	})

	return { ok: true, payment: toDto(payment!) }
}
