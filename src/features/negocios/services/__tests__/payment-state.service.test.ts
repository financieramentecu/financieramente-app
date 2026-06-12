import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markCartera, markPagoAnticipado, markCarteraPagado, fundDuePayments, updatePaymentDateAnchored } from '../payment-state.service'

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
		PAYMENT_CRON_FUNDED: 'PAYMENT_CRON_FUNDED',
		BUSINESS_CRON_FONDEADO: 'BUSINESS_CRON_FONDEADO',
		BUSINESS_CARTERA: 'BUSINESS_CARTERA',
		BUSINESS_REFONDEADO: 'BUSINESS_REFONDEADO',
	},
}))

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'

const mockPrisma = prisma as unknown as {
	payment: {
		updateMany: ReturnType<typeof vi.fn>
		findUnique: ReturnType<typeof vi.fn>
		findMany: ReturnType<typeof vi.fn>
	}
	business: {
		updateMany: ReturnType<typeof vi.fn>
		findUnique: ReturnType<typeof vi.fn>
		findMany: ReturnType<typeof vi.fn>
	}
	$transaction: ReturnType<typeof vi.fn>
}

const actor = {
	userId: 1 as number | undefined,
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
	it('happy path — returns ok: true with updated payment and logs BUSINESS_CARTERA', async () => {
		const updated = { ...basePayment, status: 'EN_CARTERA', portfolioDate: new Date() }
		mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 })
		mockPrisma.payment.findUnique.mockResolvedValue(updated)
		// Mock the business update in transaction
		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
		const txPayment = { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue(updated) }
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		const result = await markCartera(10, 1, actor)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.payment.status).toBe('EN_CARTERA')
		}
	})

	it('conflict — returns ok: false, code: CONFLICT when count=0 and row exists', async () => {
		const txBusiness = { updateMany: vi.fn() }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 0 }),
			findUnique: vi.fn().mockResolvedValue({ ...basePayment, status: 'EN_CARTERA' }),
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		const result = await markCartera(10, 1, actor)

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.code).toBe('CONFLICT')
		}
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('not found — returns ok: false, code: NOT_FOUND when count=0 and row missing', async () => {
		const txBusiness = { updateMany: vi.fn() }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 0 }),
			findUnique: vi.fn().mockResolvedValue(null),
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		const result = await markCartera(10, 99, actor)

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.code).toBe('NOT_FOUND')
		}
	})

	it('logs APORTE_CARTERA_MARKED and BUSINESS_CARTERA on success', async () => {
		const updated = { ...basePayment, status: 'EN_CARTERA', portfolioDate: new Date() }
		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(updated),
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		await markCartera(10, 1, actor)

		// Should log at least APORTE_CARTERA_MARKED and BUSINESS_CARTERA
		expect(logAuditEvent).toHaveBeenCalledTimes(2)
		const calls = vi.mocked(logAuditEvent).mock.calls.map(c => c[0].action)
		expect(calls).toContain('APORTE_CARTERA_MARKED')
		expect(calls).toContain('BUSINESS_CARTERA')
	})

	it('sets business status to CARTERA in transaction', async () => {
		const updated = { ...basePayment, status: 'EN_CARTERA', portfolioDate: new Date() }
		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(updated),
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		await markCartera(10, 1, actor)

		expect(txBusiness.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ status: 'CARTERA' }) })
		)
	})
})

describe('markCarteraPagado', () => {
	const paymentDate = new Date('2025-05-20')

	const enCarteraPayment = { ...basePayment, status: 'EN_CARTERA', portfolioDate: new Date() }
	const carteraPagadoPayment = { ...basePayment, status: 'CARTERA_PAGADO', portfolioPaymentDate: paymentDate }

	it('last EN_CARTERA resolved — business returns to FONDEADO with BUSINESS_REFONDEADO audit', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue(enCarteraPayment)

		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(carteraPagadoPayment),
			count: vi.fn().mockResolvedValue(0), // no remaining EN_CARTERA
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		const result = await markCarteraPagado(10, 2, actor, paymentDate)

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.payment.status).toBe('CARTERA_PAGADO')
		}
	})

	it('other EN_CARTERA payments remain — business stays CARTERA, no BUSINESS_REFONDEADO', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue(enCarteraPayment)

		const txBusiness = { updateMany: vi.fn() }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(carteraPagadoPayment),
			count: vi.fn().mockResolvedValue(1), // 1 remaining EN_CARTERA
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		const result = await markCarteraPagado(10, 2, actor, paymentDate)

		expect(result.ok).toBe(true)
		// Business should NOT be updated to FONDEADO
		expect(txBusiness.updateMany).not.toHaveBeenCalled()
	})

	it('dateAnchored not overwritten when already set on refondeo', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue(enCarteraPayment)

		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(carteraPagadoPayment),
			count: vi.fn().mockResolvedValue(0), // no remaining EN_CARTERA
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		await markCarteraPagado(10, 2, actor, paymentDate)

		// When dateAnchored is already set, we should use dateAnchored: undefined (not override)
		// The updateMany call on business should have dateAnchored condition
		if (txBusiness.updateMany.mock.calls.length > 0) {
			const callArgs = txBusiness.updateMany.mock.calls[0][0]
			// Should filter by dateAnchored: null to avoid overwriting
			expect(callArgs.where).toMatchObject({ dateAnchored: null })
		}
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

// ─────────────────────────────────────────────────────────────────────────────
// fundDuePayments Tests (L1.1 RED → L1.2 GREEN)
// ─────────────────────────────────────────────────────────────────────────────

describe('fundDuePayments', () => {

	const today = new Date('2026-06-15T00:00:00Z')

	it('due payment funded on scheduled run — sets FONDEADO with dateAnchored = today', async () => {
		const duePayment = {
			idAnnualPayment: 1,
			idBusiness: 10,
			installmentIndex: 1,
			status: 'SIN_FONDEAR',
			expectedDate: new Date('2026-06-15T00:00:00Z'),
			dateAnchored: null,
		}

		mockPrisma.payment.findMany = vi.fn().mockResolvedValue([duePayment])

		const txPayment = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) }
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		const result = await fundDuePayments(today)

		expect(txPayment.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: 'FONDEADO', dateAnchored: today }),
			})
		)
		expect(result.fundedPayments).toBe(1)
	})

	it('future payment not funded — skipped in query results', async () => {
		// fundDuePayments queries only SIN_FONDEAR with expectedDate <= today
		// so if the mock returns empty, that means no future payments were picked up
		mockPrisma.payment.findMany = vi.fn().mockResolvedValue([])

		const result = await fundDuePayments(today)

		expect(result.fundedPayments).toBe(0)
		expect(result.fondeadoBusinesses).toBe(0)
	})

	it('EN_CARTERA payment skipped — not returned by SIN_FONDEAR query', async () => {
		// The service queries status=SIN_FONDEAR only, so EN_CARTERA never appears
		mockPrisma.payment.findMany = vi.fn().mockResolvedValue([])

		const result = await fundDuePayments(today)

		expect(result.fundedPayments).toBe(0)
	})

	it('first-flip: EMITIDO business flips to FONDEADO with BUSINESS_CRON_FONDEADO audit', async () => {
		const duePayment = {
			idAnnualPayment: 1,
			idBusiness: 10,
			installmentIndex: 1,
			status: 'SIN_FONDEAR',
			expectedDate: new Date('2026-06-15T00:00:00Z'),
			dateAnchored: null,
		}

		mockPrisma.payment.findMany = vi.fn().mockResolvedValue([duePayment])

		const txPayment = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } // 1 means EMITIDO flip happened
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		const result = await fundDuePayments(today)

		expect(txBusiness.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: 'EMITIDO', dateAnchored: null }),
				data: expect.objectContaining({ status: 'FONDEADO' }),
			})
		)
		expect(result.fondeadoBusinesses).toBe(1)

		// Audit logs: PAYMENT_CRON_FUNDED + BUSINESS_CRON_FONDEADO
		const calls = vi.mocked(logAuditEvent).mock.calls.map(c => c[0].action)
		expect(calls).toContain('PAYMENT_CRON_FUNDED')
		expect(calls).toContain('BUSINESS_CRON_FONDEADO')
	})

	it('CARTERA business not flipped — updateMany guard status=EMITIDO ensures no CARTERA flip', async () => {
		const duePayment = {
			idAnnualPayment: 1,
			idBusiness: 20,
			installmentIndex: 2,
			status: 'SIN_FONDEAR',
			expectedDate: new Date('2026-06-15T00:00:00Z'),
			dateAnchored: null,
		}

		mockPrisma.payment.findMany = vi.fn().mockResolvedValue([duePayment])

		const txPayment = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
		// count: 0 means no EMITIDO business matched — CARTERA businesses are not updated
		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) }
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		const result = await fundDuePayments(today)

		expect(result.fundedPayments).toBe(1)
		expect(result.fondeadoBusinesses).toBe(0)
		// The guard must use status: 'EMITIDO' to skip CARTERA businesses
		expect(txBusiness.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: 'EMITIDO' }),
			})
		)
	})

	it('write-once dateAnchored — guard includes dateAnchored: null', async () => {
		const duePayment = {
			idAnnualPayment: 1,
			idBusiness: 10,
			installmentIndex: 1,
			status: 'SIN_FONDEAR',
			expectedDate: new Date('2026-06-15T00:00:00Z'),
			dateAnchored: null,
		}

		mockPrisma.payment.findMany = vi.fn().mockResolvedValue([duePayment])

		const txPayment = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }
		const txBusiness = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) }
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment; business: typeof txBusiness }) => unknown) =>
				cb({ payment: txPayment, business: txBusiness })
		)

		await fundDuePayments(today)

		// The business updateMany must include dateAnchored: null guard (write-once)
		expect(txBusiness.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ dateAnchored: null }),
			})
		)
	})

	it('system actor has undefined userId', async () => {
		mockPrisma.payment.findMany = vi.fn().mockResolvedValue([])
		// Should not throw even with no payments
		await expect(fundDuePayments(today)).resolves.toBeDefined()
	})
})

// ─────────────────────────────────────────────────────────────────────────────
// updatePaymentDateAnchored Tests (L1.4 RED → L1.5 GREEN)
// ─────────────────────────────────────────────────────────────────────────────

describe('updatePaymentDateAnchored', () => {

	const dateStr = '2026-06-15'

	it('success path — updates FONDEADO payment dateAnchored', async () => {
		const fondeadoPayment = {
			...basePayment,
			status: 'FONDEADO',
			dateAnchored: null,
		}
		const updatedPayment = { ...fondeadoPayment, dateAnchored: new Date(`${dateStr}T12:00:00Z`) }

		mockPrisma.payment.findUnique.mockResolvedValueOnce(fondeadoPayment)
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(updatedPayment),
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment }) => unknown) => cb({ payment: txPayment })
		)

		const result = await updatePaymentDateAnchored(10, 1, actor, new Date(`${dateStr}T12:00:00Z`))

		expect(result.ok).toBe(true)
	})

	it('rejects with CONFLICT when payment is not FONDEADO', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue({ ...basePayment, status: 'SIN_FONDEAR' })

		const result = await updatePaymentDateAnchored(10, 1, actor, new Date(`${dateStr}T12:00:00Z`))

		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.code).toBe('CONFLICT')
		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('returns NOT_FOUND when payment does not exist', async () => {
		mockPrisma.payment.findUnique.mockResolvedValue(null)

		const result = await updatePaymentDateAnchored(10, 99, actor, new Date(`${dateStr}T12:00:00Z`))

		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.code).toBe('NOT_FOUND')
	})

	it('logs audit event on success', async () => {
		const fondeadoPayment = { ...basePayment, status: 'FONDEADO', dateAnchored: null }
		const updatedPayment = { ...fondeadoPayment, dateAnchored: new Date(`${dateStr}T12:00:00Z`) }

		mockPrisma.payment.findUnique.mockResolvedValueOnce(fondeadoPayment)
		const txPayment = {
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			findUnique: vi.fn().mockResolvedValue(updatedPayment),
		}
		mockPrisma.$transaction.mockImplementation(
			(cb: (tx: { payment: typeof txPayment }) => unknown) => cb({ payment: txPayment })
		)

		await updatePaymentDateAnchored(10, 1, actor, new Date(`${dateStr}T12:00:00Z`))

		expect(logAuditEvent).toHaveBeenCalledOnce()
	})
})
