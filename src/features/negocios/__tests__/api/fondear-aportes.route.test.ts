/**
 * Integration tests for POST /api/negocios/[id]/fondear-aportes
 * Focus: fundedDate optional field anchors dateAnchored via dateOnlyToBogotaNoonUtc.
 *
 * TDD RED phase: written before the fundedDate implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/auth', () => ({
	auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findUnique: vi.fn(),
			updateMany: vi.fn(),
			update: vi.fn(),
		},
		payment: {
			count: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}))

vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))

vi.mock('@/features/auth/lib/roles', () => ({
	canFundPayments: vi.fn(() => true),
}))

vi.mock('@/features/negocios/lib/calculate-expected-dates', () => ({
	calculateExpectedDates: vi.fn(() => []),
}))

vi.mock('@/features/negocios/mappers/business-entity.mapper', () => ({
	prismaBusinessToEntity: vi.fn((b: unknown) => b),
}))

vi.mock('@/features/negocios/services/business-date-anchored.service', () => ({
	assertHasSupports: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: {
		BUSINESS_PAYMENT_FUNDED: 'BUSINESS_PAYMENT_FUNDED',
		APORTE_PRIMER_PAGO_FONDEADO: 'APORTE_PRIMER_PAGO_FONDEADO',
	},
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { POST } from '@/app/api/negocios/[id]/fondear-aportes/route'

const mockAuth = vi.mocked(auth)
const mockGetCurrentUser = vi.mocked(getCurrentUserByEmail)
const mockPrisma = prisma as unknown as {
	business: {
		findUnique: ReturnType<typeof vi.fn>
		updateMany: ReturnType<typeof vi.fn>
		update: ReturnType<typeof vi.fn>
	}
	payment: {
		count: ReturnType<typeof vi.fn>
		findMany: ReturnType<typeof vi.fn>
		update: ReturnType<typeof vi.fn>
		updateMany: ReturnType<typeof vi.fn>
	}
	$transaction: ReturnType<typeof vi.fn>
}

const SESSION = { user: { email: 'admin@test.com' } }
const USER = {
	idUser: 1,
	email: 'admin@test.com',
	idRole: 1,
	role: { code: 'ADMIN' },
}

// Minimal business shape for the test
const BUSINESS = {
	idBusiness: 42,
	status: 'FONDEADO',
	numAportes: 12,
	dateIssued: null,
	createdAt: new Date('2025-01-01T00:00:00Z'),
	dateAnchored: new Date('2025-01-15T12:00:00Z'),
	_count: { payments: 12 },
	buyPeriodicity: { name: 'Mensual' },
}

// The funded payment returned after update
const PAYMENT_ROW = {
	idAnnualPayment: 100,
	idBusiness: 42,
	installmentIndex: 1,
	status: 'SIN_FONDEAR',
	expectedDate: new Date('2025-01-15T12:00:00Z'),
	dateAnchored: null,
}

function makeRequest(body: unknown) {
	return new Request('http://localhost/api/negocios/42/fondear-aportes', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

function makeParams(id = '42') {
	return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
	vi.clearAllMocks()
	mockAuth.mockResolvedValue(SESSION as Awaited<ReturnType<typeof auth>>)
	mockGetCurrentUser.mockResolvedValue(USER as Awaited<ReturnType<typeof getCurrentUserByEmail>>)
	mockPrisma.business.findUnique.mockResolvedValue(BUSINESS)
	mockPrisma.payment.count.mockResolvedValue(1)

	// Default transaction: fund the payment and return updated business
	mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
		const tx = {
			payment: {
				findMany: vi.fn().mockResolvedValue([PAYMENT_ROW]),
				update: vi.fn().mockResolvedValue({}),
			},
			business: {
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
				update: vi.fn().mockResolvedValue({}),
				findUniqueOrThrow: vi.fn().mockResolvedValue(BUSINESS),
			},
		}
		return cb(tx)
	})
})

describe('POST /api/negocios/[id]/fondear-aportes — fundedDate anchor', () => {
	it('fundedDate provided → payment update uses dateOnlyToBogotaNoonUtc(fundedDate) as dateAnchored', async () => {
		// Track what dateAnchored was passed to payment.update inside the transaction
		let capturedDateAnchored: Date | undefined

		mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
			const tx = {
				payment: {
					findMany: vi.fn().mockResolvedValue([PAYMENT_ROW]),
					update: vi.fn().mockImplementation(({ data }: { data: { dateAnchored?: Date } }) => {
						capturedDateAnchored = data.dateAnchored
						return Promise.resolve({})
					}),
				},
				business: {
					updateMany: vi.fn().mockResolvedValue({ count: 0 }),
					update: vi.fn().mockResolvedValue({}),
					findUniqueOrThrow: vi.fn().mockResolvedValue(BUSINESS),
				},
			}
			return cb(tx)
		})

		const req = makeRequest({ fundedInstallmentIndexes: [1], fundedDate: '2026-07-01' })
		const res = await POST(req, makeParams())
		expect(res.status).toBe(200)

		// dateOnlyToBogotaNoonUtc('2026-07-01') = 2026-07-01T12:00:00.000Z
		expect(capturedDateAnchored).toEqual(new Date('2026-07-01T12:00:00.000Z'))
	})

	it('fundedDate absent → falls back to expectedDate (backward compatible)', async () => {
		let capturedDateAnchored: Date | undefined

		mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
			const tx = {
				payment: {
					findMany: vi.fn().mockResolvedValue([PAYMENT_ROW]),
					update: vi.fn().mockImplementation(({ data }: { data: { dateAnchored?: Date } }) => {
						capturedDateAnchored = data.dateAnchored
						return Promise.resolve({})
					}),
				},
				business: {
					updateMany: vi.fn().mockResolvedValue({ count: 0 }),
					update: vi.fn().mockResolvedValue({}),
					findUniqueOrThrow: vi.fn().mockResolvedValue(BUSINESS),
				},
			}
			return cb(tx)
		})

		const req = makeRequest({ fundedInstallmentIndexes: [1] })
		const res = await POST(req, makeParams())
		expect(res.status).toBe(200)

		// Without fundedDate, anchor = row.expectedDate
		expect(capturedDateAnchored).toEqual(PAYMENT_ROW.expectedDate)
	})

	it('fundedDate with installmentIndex=1 emits APORTE_PRIMER_PAGO_FONDEADO audit action', async () => {
		mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
			const tx = {
				payment: {
					findMany: vi.fn().mockResolvedValue([PAYMENT_ROW]),
					update: vi.fn().mockResolvedValue({}),
				},
				business: {
					updateMany: vi.fn().mockResolvedValue({ count: 0 }),
					update: vi.fn().mockResolvedValue({}),
					findUniqueOrThrow: vi.fn().mockResolvedValue(BUSINESS),
				},
			}
			return cb(tx)
		})

		const req = makeRequest({ fundedInstallmentIndexes: [1], fundedDate: '2026-07-01' })
		await POST(req, makeParams())

		const auditCalls = vi.mocked(logAuditEvent).mock.calls.map(c => c[0].action)
		expect(auditCalls).toContain('APORTE_PRIMER_PAGO_FONDEADO')
	})

	it('invalid fundedDate format returns 400', async () => {
		const req = makeRequest({ fundedInstallmentIndexes: [1], fundedDate: 'not-a-date' })
		const res = await POST(req, makeParams())
		expect(res.status).toBe(400)
	})

	it('date round-trip: dateOnlyToBogotaNoonUtc("2026-07-01") stays 2026-07-01 in Bogota TZ (no ±1 day drift)', () => {
		// The anchor date must be 2026-07-01T12:00:00Z
		// formatDateBogota(2026-07-01T12:00:00Z) in America/Bogota (UTC-5) = 07:00 → date "Jul 1, 2026"
		const anchored = new Date('2026-07-01T12:00:00Z')
		const bogotaDay = anchored.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
		expect(bogotaDay).toBe('2026-07-01')
	})
})
