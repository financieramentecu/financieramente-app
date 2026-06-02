import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markCartera, markPagoAnticipado, markCarteraPagado, markPrimerPagoFondeado } from '../payment-state.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		payment: {
			updateMany: vi.fn(),
			findUnique: vi.fn(),
		},
		business: {
			updateMany: vi.fn(),
			findUnique: vi.fn(),
		},
		$transaction: vi.fn((cb: (tx: unknown) => unknown) => cb({
			payment: { updateMany: vi.fn() },
			business: { updateMany: vi.fn() },
		})),
	},
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: {
		APORTE_CARTERA_MARKED: 'APORTE_CARTERA_MARKED',
		APORTE_CARTERA_UNMARKED: 'APORTE_CARTERA_UNMARKED',
		APORTE_PAGO_ANTICIPADO_MARKED: 'APORTE_PAGO_ANTICIPADO_MARKED',
		APORTE_CARTERA_PAGADO: 'APORTE_CARTERA_PAGADO',
		APORTE_PRIMER_PAGO_FONDEADO: 'APORTE_PRIMER_PAGO_FONDEADO',
	},
}))

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'

const mockPrisma = prisma as unknown as {
	payment: {
		updateMany: ReturnType<typeof vi.fn>
		findUnique: ReturnType<typeof vi.fn>
	}
	business: {
		updateMany: ReturnType<typeof vi.fn>
		findUnique: ReturnType<typeof vi.fn>
	}
	$transaction: ReturnType<typeof vi.fn>
}

const actor = {
	userId: 1,
	email: 'test@example.com',
	ip: '127.0.0.1',
	ua: 'jest',
}

const basePayment = {
	installmentIndex: 1,
	status: 'FONDEADO',
	dateAnchored: null,
	expectedDate: null,
	portfolioDate: null,
	earlyPaymentDate: null,
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('markCartera', () => {
	it('happy path — returns ok: true with updated payment', async () => {
		const updated = { ...basePayment, status: 'EN_CARTERA', portfolioDate: new Date() }
		mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 })
		mockPrisma.payment.findUnique.mockResolvedValue(updated)

		const result = await markCartera(10, 1, actor)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.payment.status).toBe('EN_CARTERA')
		}
		expect(logAuditEvent).toHaveBeenCalledOnce()
	})

	it('conflict — returns ok: false, code: CONFLICT when count=0 and row exists', async () => {
		mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 })
		mockPrisma.payment.findUnique.mockResolvedValue({
			...basePayment,
			status: 'EN_CARTERA',
		})

		const result = await markCartera(10, 1, actor)

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.code).toBe('CONFLICT')
		}
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('not found — returns ok: false, code: NOT_FOUND when count=0 and row missing', async () => {
		mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 })
		mockPrisma.payment.findUnique.mockResolvedValue(null)

		const result = await markCartera(10, 99, actor)

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.code).toBe('NOT_FOUND')
		}
	})
})

describe('markCarteraPagado', () => {
	const paymentDate = new Date('2025-05-20')

	const enCarteraPayment = { ...basePayment, status: 'EN_CARTERA', portfolioDate: new Date() }
	const carteraPagadoPayment = { ...basePayment, status: 'CARTERA_PAGADO', portfolioPaymentDate: paymentDate }

	it('happy path (index > 1) — transitions EN_CARTERA to CARTERA_PAGADO, no business update', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue(enCarteraPayment)
		const txBusiness = { update: vi.fn() }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(carteraPagadoPayment),
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		const result = await markCarteraPagado(10, 2, actor, paymentDate)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.payment.status).toBe('CARTERA_PAGADO')
			expect(result.payment.portfolioPaymentDate).toBe(paymentDate.toISOString())
		}
		expect(txBusiness.update).not.toHaveBeenCalled()
		expect(logAuditEvent).toHaveBeenCalledOnce()
	})

	it('index 1 + business EMITIDO — also fondea business in transaction', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue(enCarteraPayment)
		mockPrisma.business.findUnique.mockResolvedValue({ idBusiness: 10, status: 'EMITIDO' })
		const txBusiness = { update: vi.fn().mockResolvedValue(null) }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(carteraPagadoPayment),
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		const result = await markCarteraPagado(10, 1, actor, paymentDate)

		expect(result.ok).toBe(true)
		expect(txBusiness.update).toHaveBeenCalledOnce()
		expect(txBusiness.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: 'FONDEADO', dateAnchored: paymentDate }),
			})
		)
		expect(logAuditEvent).toHaveBeenCalledOnce()
	})

	it('index 1 + business already FONDEADO — does not update business', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue(enCarteraPayment)
		mockPrisma.business.findUnique.mockResolvedValue({ idBusiness: 10, status: 'FONDEADO' })
		const txBusiness = { update: vi.fn() }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(carteraPagadoPayment),
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		await markCarteraPagado(10, 1, actor, paymentDate)

		expect(txBusiness.update).not.toHaveBeenCalled()
	})

	it('conflict — returns CONFLICT when status is not EN_CARTERA (row exists)', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue({ ...basePayment, status: 'FONDEADO' })

		const result = await markCarteraPagado(10, 1, actor, new Date())

		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.code).toBe('CONFLICT')
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('not found — returns NOT_FOUND when payment does not exist', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue(null)

		const result = await markCarteraPagado(10, 99, actor, new Date())

		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.code).toBe('NOT_FOUND')
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('audit suppressed on conflict — does not call logAuditEvent when transition is invalid', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue({ ...basePayment, status: 'CARTERA_PAGADO' })

		await markCarteraPagado(10, 1, actor, new Date())

		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})

describe('markPagoAnticipado', () => {
	it('happy path — sets PAGO_ANTICIPADO with earlyPaymentDate', async () => {
		const updated = {
			...basePayment,
			status: 'PAGO_ANTICIPADO',
			earlyPaymentDate: new Date(),
		}
		mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 })
		mockPrisma.payment.findUnique.mockResolvedValue(updated)

		const result = await markPagoAnticipado(10, 1, actor)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.payment.status).toBe('PAGO_ANTICIPADO')
		}
		expect(logAuditEvent).toHaveBeenCalledOnce()
	})

	it('conflict when status is EN_CARTERA', async () => {
		mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 })
		mockPrisma.payment.findUnique.mockResolvedValue({
			...basePayment,
			status: 'EN_CARTERA',
		})

		const result = await markPagoAnticipado(10, 1, actor)

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.code).toBe('CONFLICT')
		}
	})
})

describe('markPrimerPagoFondeado', () => {
	const fondeoDate = new Date('2024-01-15')

	const fondeadoPayment = {
		installmentIndex: 1,
		status: 'FONDEADO',
		dateAnchored: fondeoDate,
		expectedDate: null,
		portfolioDate: null,
		earlyPaymentDate: null,
		portfolioPaymentDate: null,
	}

	beforeEach(() => {
		const txBusiness = { update: vi.fn() }
		const txPayment = { updateMany: vi.fn(), findUnique: vi.fn() }
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { business: typeof txBusiness; payment: typeof txPayment }) => unknown) =>
				cb({ business: txBusiness, payment: txPayment })
		)
	})

	it('happy path — returns ok: true, updates both Business and Payment, logs audit', async () => {
		mockPrisma.business.findUnique.mockResolvedValue({ idBusiness: 10, status: 'EMITIDO', dateAnchored: null })
		const txBusiness = { update: vi.fn().mockResolvedValue(null) }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(fondeadoPayment),
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { business: typeof txBusiness; payment: typeof txPayment }) => unknown) =>
				cb({ business: txBusiness, payment: txPayment })
		)

		const result = await markPrimerPagoFondeado(10, 1, actor, fondeoDate)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.payment.status).toBe('FONDEADO')
			expect(result.payment.dateAnchored).toBe(fondeoDate.toISOString())
		}
		expect(txBusiness.update).toHaveBeenCalledOnce()
		expect(txPayment.updateMany).toHaveBeenCalledOnce()
		expect(logAuditEvent).toHaveBeenCalledOnce()
	})

	it('conflict — returns CONFLICT when business count=0 (already FONDEADO)', async () => {
		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) }
		const txPayment = { updateMany: vi.fn() }
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { business: typeof txBusiness; payment: typeof txPayment }) => unknown) =>
				cb({ business: txBusiness, payment: txPayment })
		)
		mockPrisma.business.findUnique.mockResolvedValue({ id: 10, status: 'FONDEADO' })

		const result = await markPrimerPagoFondeado(10, 1, actor, fondeoDate)

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.code).toBe('CONFLICT')
		}
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('not found — returns NOT_FOUND when business does not exist', async () => {
		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) }
		const txPayment = { updateMany: vi.fn() }
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { business: typeof txBusiness; payment: typeof txPayment }) => unknown) =>
				cb({ business: txBusiness, payment: txPayment })
		)
		mockPrisma.business.findUnique.mockResolvedValue(null)

		const result = await markPrimerPagoFondeado(10, 1, actor, fondeoDate)

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.code).toBe('NOT_FOUND')
		}
		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})
