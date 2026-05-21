import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { NextResponse } from 'next/server'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import { AnnualPaymentStatus } from '@prisma/client'
import { mockUserWithRole } from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import { mockPrismaBusinessEmitido } from '@/features/negocios/__tests__/fixtures/mock-prisma-business'

vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: { findUnique: vi.fn() },
		payment: { count: vi.fn() },
		$transaction: vi.fn(),
	},
}))
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/negocios/mappers/business-entity.mapper')
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { BUSINESS_PAYMENT_FUNDED: 'BUSINESS_PAYMENT_FUNDED' },
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

function buildUser(email: string, roleCode: UserRole) {
	return {
		...mockUserWithRole,
		email,
		idUser: 10,
		idRole: 1,
		role: {
			idRole: 1,
			code: roleCode,
			name: roleCode,
			description: '',
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	}
}

describe('POST /api/negocios/[id]/fondear-aportes', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetUser = vi.mocked(getCurrentUserByEmail)
	const mockFindUnique = vi.mocked(prisma.business.findUnique)
	const mockPaymentCount = vi.mocked(prisma.payment.count)
	const mockTransaction = vi.mocked(prisma.$transaction)
	const mockToEntity = vi.mocked(prismaBusinessToEntity)
	const mockLog = vi.mocked(logAuditEvent)
	const mockNextJson = vi.mocked(NextResponse.json)

	beforeEach(() => {
		vi.clearAllMocks()
		mockNextJson.mockImplementation((data: unknown, init?: { status?: number }) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		}) as unknown as NextResponse)
	})
	afterEach(() => vi.restoreAllMocks())

	it('401 sin sesión', async () => {
		mockAuth.mockResolvedValue(null)
		const res = await POST(new Request('http://localhost/api/negocios/1/fondear-aportes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fundedInstallmentIndexes: [1] }),
		}), { params: Promise.resolve({ id: '1' }) })
		expect(res.status).toBe(401)
	})

	it('403 AGENTE no puede fondear', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'coach@test.com' } } as never)
		mockGetUser.mockResolvedValue(buildUser('coach@test.com', UserRole.AGENTE) as never)

		const res = await POST(new Request('http://localhost/api/negocios/1/fondear-aportes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fundedInstallmentIndexes: [1] }),
		}), { params: Promise.resolve({ id: '1' }) })
		const body = await res.json()

		expect(res.status).toBe(403)
		expect(body.error).toContain('permisos')
	})

	it('400 negocio sin aportes → fondeo directo', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'admin@test.com' } } as never)
		mockGetUser.mockResolvedValue(buildUser('admin@test.com', UserRole.ADMIN) as never)
		mockFindUnique.mockResolvedValue({
			idBusiness: 1,
			status: BUSINESS_STATUS.EMITIDO,
			_count: { payments: 0 },
			buyPeriodicity: { name: 'Mensual' },
			numAportes: 0,
		} as never)

		const res = await POST(new Request('http://localhost/api/negocios/1/fondear-aportes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fundedInstallmentIndexes: [1] }),
		}), { params: Promise.resolve({ id: '1' }) })
		const body = await res.json()

		expect(res.status).toBe(400)
		expect(body.error).toContain('fondeo directo')
	})

	it('200 EMITIDO → FONDEADO: persiste expectedDate y emite audit', async () => {
		const mockDateIssued = new Date('2026-01-15T12:00:00Z')
		mockAuth.mockResolvedValue({ user: { email: 'admin@test.com' } } as never)
		mockGetUser.mockResolvedValue(buildUser('admin@test.com', UserRole.ADMIN) as never)
		mockFindUnique.mockResolvedValue({
			idBusiness: 5,
			idUser: 99,
			status: BUSINESS_STATUS.EMITIDO,
			_count: { payments: 3 },
			buyPeriodicity: { name: 'Mensual' },
			numAportes: 3,
			dateIssued: mockDateIssued,
		} as never)
		mockPaymentCount.mockResolvedValue(3)

		const paymentUpdate = vi.fn().mockResolvedValue({})
		const paymentFindMany = vi.fn()
			.mockResolvedValueOnce([{ idAnnualPayment: 10, installmentIndex: 1, status: AnnualPaymentStatus.SIN_FONDEAR }])
			.mockResolvedValueOnce([
				{ idAnnualPayment: 10, installmentIndex: 1 },
				{ idAnnualPayment: 11, installmentIndex: 2 },
				{ idAnnualPayment: 12, installmentIndex: 3 },
			])
		const fundedReturn = { ...mockPrismaBusinessEmitido, idBusiness: 5, status: BUSINESS_STATUS.FONDEADO }

		mockTransaction.mockImplementation(async (fn) => fn({
			payment: { findMany: paymentFindMany, update: paymentUpdate },
			business: {
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
				update: vi.fn(),
				findUniqueOrThrow: vi.fn().mockResolvedValue(fundedReturn),
			},
		} as never))

		mockToEntity.mockReturnValue({ id: 5, status: BUSINESS_STATUS.FONDEADO } as never)

		const res = await POST(new Request('http://localhost/api/negocios/5/fondear-aportes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fundedInstallmentIndexes: [1] }),
		}), { params: Promise.resolve({ id: '5' }) })
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data?.status).toBe(BUSINESS_STATUS.FONDEADO)
		
		// Verificar que se haya llamado a update de pagos con las fechas calculadas a partir de dateIssued (2026-01-15T12:00:00Z)
		expect(paymentUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idAnnualPayment: 10 },
				data: expect.objectContaining({ expectedDate: new Date('2026-01-15T12:00:00.000Z') }),
			})
		)
		expect(paymentUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idAnnualPayment: 11 },
				data: expect.objectContaining({ expectedDate: new Date('2026-02-15T12:00:00.000Z') }),
			})
		)
		expect(paymentUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idAnnualPayment: 12 },
				data: expect.objectContaining({ expectedDate: new Date('2026-03-15T12:00:00.000Z') }),
			})
		)

		expect(mockLog).toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.BUSINESS_PAYMENT_FUNDED })
		)
	})

	it('400 sin cuotas pendientes entre los índices', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'admin@test.com' } } as never)
		mockGetUser.mockResolvedValue(buildUser('admin@test.com', UserRole.ADMIN) as never)
		mockFindUnique.mockResolvedValue({
			idBusiness: 6,
			status: BUSINESS_STATUS.FONDEADO,
			_count: { payments: 2 },
			buyPeriodicity: { name: 'Anual' },
			numAportes: 2,
		} as never)
		mockPaymentCount.mockResolvedValue(1)

		mockTransaction.mockImplementation(async (fn) => fn({
			payment: {
				findMany: vi.fn().mockResolvedValue([]),
				update: vi.fn(),
			},
			business: { updateMany: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
		} as never))

		const res = await POST(new Request('http://localhost/api/negocios/6/fondear-aportes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fundedInstallmentIndexes: [1] }),
		}), { params: Promise.resolve({ id: '6' }) })
		const body = await res.json()

		expect(res.status).toBe(400)
		expect(body.error).toContain('pendientes')
	})
})
