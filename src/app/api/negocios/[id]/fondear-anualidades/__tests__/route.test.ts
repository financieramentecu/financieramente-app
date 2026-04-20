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
import {
	mockUserWithRole,
} from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import { mockPrismaBusinessEmitido } from '@/features/negocios/__tests__/fixtures/mock-prisma-business'

vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findUnique: vi.fn(),
		},
		annualPayment: {
			count: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}))
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/negocios/mappers/business-entity.mapper')
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		BUSINESS_ANNUAL_FUNDED: 'BUSINESS_ANNUAL_FUNDED',
	},
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

function buildUserWithRole(email: string, roleCode: UserRole) {
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
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-01'),
		},
	}
}

describe('POST /api/negocios/[id]/fondear-anualidades', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockFindUnique = vi.mocked(prisma.business.findUnique)
	const mockAnnualCount = vi.mocked(prisma.annualPayment.count)
	const mockTransaction = vi.mocked(prisma.$transaction)
	const mockPrismaBusinessToEntity = vi.mocked(prismaBusinessToEntity)
	const mockLogAuditEvent = vi.mocked(logAuditEvent)
	const mockNextResponseJson = vi.mocked(NextResponse.json)

	beforeEach(() => {
		vi.clearAllMocks()
		mockNextResponseJson.mockImplementation(
			(data: unknown, init?: { status?: number }) => {
				return {
					json: () => Promise.resolve(data),
					status: init?.status || 200,
				} as unknown as NextResponse
			}
		)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('401 sin sesión', async () => {
		mockAuth.mockResolvedValue(null)

		const request = new Request(
			'http://localhost/api/negocios/1/fondear-anualidades',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fundedInstallmentIndexes: [1] }),
			}
		)

		const response = await POST(request, {
			params: Promise.resolve({ id: '1' }),
		})
		const body = await response.json()

		expect(response.status).toBe(401)
		expect(body.data).toBeNull()
		expect(mockFindUnique).not.toHaveBeenCalled()
	})

	it('400 cuando no hay cuotas pendientes entre los índices', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'admin@test.com' } } as never)
		mockGetCurrentUserByEmail.mockResolvedValue(
			buildUserWithRole('admin@test.com', UserRole.ADMIN) as never
		)
		mockFindUnique.mockResolvedValue({
			idBusiness: 2,
			idUser: 10,
			status: BUSINESS_STATUS.EMITIDO,
			_count: { annualPayments: 2 },
		} as never)
		mockAnnualCount.mockResolvedValue(2)

		mockTransaction.mockImplementation(async (fn) => {
			const tx = {
				annualPayment: {
					findMany: vi.fn().mockResolvedValue([]),
				},
				business: {
					updateMany: vi.fn(),
					findUniqueOrThrow: vi.fn(),
				},
			}
			return fn(tx as never)
		})

		const request = new Request(
			'http://localhost/api/negocios/2/fondear-anualidades',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fundedInstallmentIndexes: [9] }),
			}
		)

		const response = await POST(request, {
			params: Promise.resolve({ id: '2' }),
		})
		const body = await response.json()

		expect(response.status).toBe(400)
		expect(body.error).toContain('pendientes')
	})

	it('200 EMITIDO — transición y auditoría', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'admin@test.com' } } as never)
		mockGetCurrentUserByEmail.mockResolvedValue(
			buildUserWithRole('admin@test.com', UserRole.ADMIN) as never
		)
		mockFindUnique.mockResolvedValue({
			idBusiness: 2,
			idUser: 10,
			status: BUSINESS_STATUS.EMITIDO,
			_count: { annualPayments: 1 },
		} as never)
		mockAnnualCount.mockResolvedValue(1)

		const fundedReturn = {
			...mockPrismaBusinessEmitido,
			status: BUSINESS_STATUS.FONDEADO,
			dateAnchored: new Date(),
			_count: { annualPayments: 1 },
		}

		mockTransaction.mockImplementation(async (fn) => {
			const tx = {
				annualPayment: {
					findMany: vi.fn().mockResolvedValue([
						{
							idAnnualPayment: 100,
							installmentIndex: 1,
							status: AnnualPaymentStatus.SIN_FONDEAR,
						},
					]),
					update: vi.fn().mockResolvedValue({}),
				},
				business: {
					updateMany: vi.fn().mockResolvedValue({ count: 1 }),
					findUniqueOrThrow: vi.fn().mockResolvedValue(fundedReturn),
				},
			}
			return fn(tx as never)
		})

		mockPrismaBusinessToEntity.mockReturnValue({
			id: 2,
			status: BUSINESS_STATUS.FONDEADO,
			dateAnchored: new Date().toISOString(),
		} as never)

		const request = new Request(
			'http://localhost/api/negocios/2/fondear-anualidades',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fundedInstallmentIndexes: [1] }),
			}
		)

		const response = await POST(request, {
			params: Promise.resolve({ id: '2' }),
		})
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data?.status).toBe(BUSINESS_STATUS.FONDEADO)
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.BUSINESS_ANNUAL_FUNDED,
			})
		)
	})

	it('200 FONDEADO padre — solo actualiza cuotas; sin business.updateMany', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'admin@test.com' } } as never)
		mockGetCurrentUserByEmail.mockResolvedValue(
			buildUserWithRole('admin@test.com', UserRole.ADMIN) as never
		)
		mockFindUnique.mockResolvedValue({
			idBusiness: 7,
			idUser: 10,
			status: BUSINESS_STATUS.FONDEADO,
			_count: { annualPayments: 3 },
		} as never)
		mockAnnualCount.mockResolvedValue(2)

		const fundedReturn = {
			...mockPrismaBusinessEmitido,
			idBusiness: 7,
			status: BUSINESS_STATUS.FONDEADO,
			dateAnchored: new Date(),
			_count: { annualPayments: 3 },
		}

		const updateMany = vi.fn().mockResolvedValue({ count: 0 })
		const annualUpdate = vi.fn().mockResolvedValue({})

		mockTransaction.mockImplementation(async (fn) => {
			const tx = {
				annualPayment: {
					findMany: vi.fn().mockResolvedValue([
						{
							idAnnualPayment: 200,
							installmentIndex: 2,
							status: AnnualPaymentStatus.SIN_FONDEAR,
						},
					]),
					update: annualUpdate,
				},
				business: {
					updateMany,
					findUniqueOrThrow: vi.fn().mockResolvedValue(fundedReturn),
				},
			}
			return fn(tx as never)
		})

		mockPrismaBusinessToEntity.mockReturnValue({
			id: 7,
			status: BUSINESS_STATUS.FONDEADO,
		} as never)

		const request = new Request(
			'http://localhost/api/negocios/7/fondear-anualidades',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fundedInstallmentIndexes: [2] }),
			}
		)

		const response = await POST(request, {
			params: Promise.resolve({ id: '7' }),
		})
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(updateMany).not.toHaveBeenCalled()
		expect(annualUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idAnnualPayment: 200 },
				data: expect.objectContaining({
					status: AnnualPaymentStatus.FONDEADO,
				}),
			})
		)
		expect(body.data?.status).toBe(BUSINESS_STATUS.FONDEADO)
		expect(mockLogAuditEvent).toHaveBeenCalled()
	})

	it('400 cuando los índices no tienen cuota SIN_FONDEAR (ya FONDEADAS)', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'admin@test.com' } } as never)
		mockGetCurrentUserByEmail.mockResolvedValue(
			buildUserWithRole('admin@test.com', UserRole.ADMIN) as never
		)
		mockFindUnique.mockResolvedValue({
			idBusiness: 8,
			idUser: 10,
			status: BUSINESS_STATUS.FONDEADO,
			_count: { annualPayments: 2 },
		} as never)
		mockAnnualCount.mockResolvedValue(1)

		mockTransaction.mockImplementation(async (fn) => {
			const tx = {
				annualPayment: {
					findMany: vi.fn().mockResolvedValue([]),
				},
				business: {
					updateMany: vi.fn(),
					findUniqueOrThrow: vi.fn(),
				},
			}
			return fn(tx as never)
		})

		const request = new Request(
			'http://localhost/api/negocios/8/fondear-anualidades',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fundedInstallmentIndexes: [1] }),
			}
		)

		const response = await POST(request, {
			params: Promise.resolve({ id: '8' }),
		})
		const body = await response.json()

		expect(response.status).toBe(400)
		expect(body.error).toContain('pendientes')
		expect(mockPrismaBusinessToEntity).not.toHaveBeenCalled()
	})
})
