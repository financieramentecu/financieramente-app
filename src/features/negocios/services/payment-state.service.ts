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

type PrismaTx = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

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

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Counts remaining EN_CARTERA payments for a business.
 * Used by markCartera and markCarteraPagado to avoid duplicating the query.
 */
async function countRemainingCartera(
	tx: PrismaTx,
	businessId: number
): Promise<number> {
	return (tx as unknown as typeof prisma).payment.count({
		where: {
			idBusiness: businessId,
			status: AnnualPaymentStatus.EN_CARTERA,
		},
	})
}

/**
 * Per-business transaction body for cron funding.
 * Funds all given payment indexes for a business and conditionally flips
 * the business status from EMITIDO to FONDEADO (write-once via guard).
 */
async function fundSingleBusiness(
	tx: PrismaTx,
	businessId: number,
	paymentIndexes: number[],
	today: Date,
	actor: Actor
): Promise<{ fundedPayments: number; fondeadoFlipped: boolean }> {
	// Fund all due payments for this business
	const paymentResult = await tx.payment.updateMany({
		where: {
			idBusiness: businessId,
			installmentIndex: { in: paymentIndexes },
			status: AnnualPaymentStatus.SIN_FONDEAR,
		},
		data: {
			status: AnnualPaymentStatus.FONDEADO,
			dateAnchored: today,
		},
	})

	// Race-free first-funding flip: only matches EMITIDO with null dateAnchored
	const businessResult = await tx.business.updateMany({
		where: {
			idBusiness: businessId,
			status: 'EMITIDO',
			dateAnchored: null,
		},
		data: {
			status: 'FONDEADO',
			dateAnchored: today,
		},
	})

	const fondeadoFlipped = businessResult.count > 0

	// Audit: payments funded
	void logAuditEvent({
		userId: actor.userId,
		action: AuditAction.PAYMENT_CRON_FUNDED,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Cron funded ${paymentResult.count} payment(s) for business ${businessId} on ${today.toISOString().slice(0, 10)}`,
	})

	// Audit: business flipped to FONDEADO
	if (fondeadoFlipped) {
		void logAuditEvent({
			userId: actor.userId,
			action: AuditAction.BUSINESS_CRON_FONDEADO,
			email: actor.email,
			ipAddress: actor.ip,
			userAgent: actor.ua,
			details: `Business ${businessId} flipped to FONDEADO by cron on ${today.toISOString().slice(0, 10)}`,
		})
	}

	return { fundedPayments: paymentResult.count, fondeadoFlipped }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public service functions
// ─────────────────────────────────────────────────────────────────────────────

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

	const payment = await prisma.$transaction(async (tx) => {
		// Transition payment to EN_CARTERA
		const result = await tx.payment.updateMany({
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
			const exists = await tx.payment.findUnique({
				where: {
					idBusiness_installmentIndex: {
						idBusiness: businessId,
						installmentIndex: index,
					},
				},
			})
			return { ok: false, code: exists ? 'CONFLICT' : 'NOT_FOUND' } as const
		}

		// Transition business to CARTERA
		await tx.business.updateMany({
			where: { idBusiness: businessId },
			data: { status: 'CARTERA' },
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

	if (payment && typeof payment === 'object' && 'ok' in payment) {
		return payment as TransitionResult
	}

	void logAuditEvent({
		userId: actor.userId,
		action: AuditAction.APORTE_CARTERA_MARKED,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Aporte ${index} del negocio ${businessId} marcado como EN_CARTERA`,
	})

	void logAuditEvent({
		userId: actor.userId,
		action: AuditAction.BUSINESS_CARTERA,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Negocio ${businessId} marcado como CARTERA`,
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

	const payment = await prisma.$transaction(async (tx) => {
		await tx.payment.updateMany({
			where: { idBusiness: businessId, installmentIndex: index, status: AnnualPaymentStatus.EN_CARTERA },
			data: { status: AnnualPaymentStatus.CARTERA_PAGADO, portfolioPaymentDate: paymentDate },
		})

		// Shared helper: check remaining EN_CARTERA for this business
		const remaining = await countRemainingCartera(tx as PrismaTx, businessId)

		if (remaining === 0) {
			// Return business to FONDEADO; write-once dateAnchored via null guard
			await tx.business.updateMany({
				where: { idBusiness: businessId, dateAnchored: null },
				data: { status: 'FONDEADO', dateAnchored: paymentDate },
			})
			// Also update businesses that already have dateAnchored set but are still CARTERA
			await tx.business.updateMany({
				where: { idBusiness: businessId, dateAnchored: { not: null } },
				data: { status: 'FONDEADO' },
			})
		}

		return tx.payment.findUnique({
			where: { idBusiness_installmentIndex: { idBusiness: businessId, installmentIndex: index } },
		})
	})

	// Check if business was returned to FONDEADO to log accordingly
	const businessAfter = await prisma.business.findUnique({ where: { idBusiness: businessId } })
	const wasRefondeado = businessAfter?.status === 'FONDEADO'

	void logAuditEvent({
		userId: actor.userId,
		action: AuditAction.APORTE_CARTERA_PAGADO,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Aporte ${index} del negocio ${businessId} marcado como CARTERA_PAGADO con fecha ${paymentDate.toISOString().slice(0, 10)}`,
	})

	if (wasRefondeado) {
		void logAuditEvent({
			userId: actor.userId,
			action: AuditAction.BUSINESS_REFONDEADO,
			email: actor.email,
			ipAddress: actor.ip,
			userAgent: actor.ua,
			details: `Negocio ${businessId} devuelto a FONDEADO tras resolver todas las carteras`,
		})
	}

	return { ok: true, payment: toDto(payment!) }
}

export async function fundDuePayments(
	today: Date
): Promise<{ fundedPayments: number; fondeadoBusinesses: number }> {
	const systemActor: Actor = {
		userId: undefined,
		email: 'system@cron',
		ip: 'system',
		ua: 'cron/fund-payments',
	}

	// Query all SIN_FONDEAR payments due today or overdue
	const duePayments = await prisma.payment.findMany({
		where: {
			status: AnnualPaymentStatus.SIN_FONDEAR,
			expectedDate: { lte: today },
		},
		select: {
			idBusiness: true,
			installmentIndex: true,
		},
	})

	if (duePayments.length === 0) {
		return { fundedPayments: 0, fondeadoBusinesses: 0 }
	}

	// Group by business
	const byBusiness = new Map<number, number[]>()
	for (const payment of duePayments) {
		const existing = byBusiness.get(payment.idBusiness) ?? []
		existing.push(payment.installmentIndex)
		byBusiness.set(payment.idBusiness, existing)
	}

	let totalFunded = 0
	let totalFondeado = 0

	// One transaction per business (SRP: fundSingleBusiness helper)
	for (const [businessId, paymentIndexes] of byBusiness) {
		const result = await prisma.$transaction(async (tx) => {
			return fundSingleBusiness(tx as PrismaTx, businessId, paymentIndexes, today, systemActor)
		})

		totalFunded += result.fundedPayments
		if (result.fondeadoFlipped) totalFondeado++
	}

	return { fundedPayments: totalFunded, fondeadoBusinesses: totalFondeado }
}

export async function updatePaymentDateAnchored(
	businessId: number,
	index: number,
	actor: Actor,
	date: Date
): Promise<TransitionResult> {
	const existingPayment = await prisma.payment.findUnique({
		where: { idBusiness_installmentIndex: { idBusiness: businessId, installmentIndex: index } },
	})

	if (!existingPayment) return { ok: false, code: 'NOT_FOUND' }
	if (existingPayment.status !== AnnualPaymentStatus.FONDEADO) return { ok: false, code: 'CONFLICT' }

	const payment = await prisma.$transaction(async (tx) => {
		await tx.payment.updateMany({
			where: {
				idBusiness: businessId,
				installmentIndex: index,
				status: AnnualPaymentStatus.FONDEADO,
			},
			data: { dateAnchored: date },
		})

		return tx.payment.findUnique({
			where: { idBusiness_installmentIndex: { idBusiness: businessId, installmentIndex: index } },
		})
	})

	void logAuditEvent({
		userId: actor.userId,
		action: AuditAction.APORTE_PRIMER_PAGO_FONDEADO,
		email: actor.email,
		ipAddress: actor.ip,
		userAgent: actor.ua,
		details: `Fecha de fondeo del aporte ${index} del negocio ${businessId} actualizada a ${date.toISOString().slice(0, 10)}`,
	})

	return { ok: true, payment: toDto(payment!) }
}
