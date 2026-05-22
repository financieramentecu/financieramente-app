import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markCartera, unmarkCartera, markPagoAnticipado } from '../payment-state.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		payment: {
			updateMany: vi.fn(),
			findUnique: vi.fn(),
		},
	},
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: {
		APORTE_CARTERA_MARKED: 'APORTE_CARTERA_MARKED',
		APORTE_CARTERA_UNMARKED: 'APORTE_CARTERA_UNMARKED',
		APORTE_PAGO_ANTICIPADO_MARKED: 'APORTE_PAGO_ANTICIPADO_MARKED',
	},
}))

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'

const mockPrisma = prisma as unknown as {
	payment: {
		updateMany: ReturnType<typeof vi.fn>
		findUnique: ReturnType<typeof vi.fn>
	}
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

describe('unmarkCartera', () => {
	it('happy path — reverts to FONDEADO', async () => {
		const updated = { ...basePayment, status: 'FONDEADO', portfolioDate: null }
		mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 })
		mockPrisma.payment.findUnique.mockResolvedValue(updated)

		const result = await unmarkCartera(10, 1, actor)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.payment.status).toBe('FONDEADO')
		}
		expect(logAuditEvent).toHaveBeenCalledOnce()
	})

	it('conflict — returns CONFLICT when row is not EN_CARTERA', async () => {
		mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 })
		mockPrisma.payment.findUnique.mockResolvedValue({
			...basePayment,
			status: 'FONDEADO',
		})

		const result = await unmarkCartera(10, 1, actor)

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.code).toBe('CONFLICT')
		}
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
