import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { NextResponse } from 'next/server'
import { UserRole } from '@/features/auth/lib/roles'
import { AnnualPaymentStatus } from '@prisma/client'
import {
	mockUserWithRole,
} from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findFirst: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/services/user.service')

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

describe('GET /api/negocios/[id]/annual-payments', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockFindFirst = vi.mocked(prisma.business.findFirst)
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

	it('retorna cuotas ordenadas por installmentIndex', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'admin@test.com' } } as never)
		mockGetCurrentUserByEmail.mockResolvedValue(
			buildUserWithRole('admin@test.com', UserRole.ADMIN) as never
		)

		mockFindFirst.mockResolvedValue({
			status: BUSINESS_STATUS.EMITIDO,
			payments: [
				{
					installmentIndex: 2,
					status: AnnualPaymentStatus.SIN_FONDEAR,
					dateAnchored: null,
					expectedDate: new Date('2026-06-01T00:00:00.000Z'),
				},
				{
					installmentIndex: 1,
					status: AnnualPaymentStatus.FONDEADO,
					dateAnchored: new Date('2025-01-01'),
					expectedDate: new Date('2025-01-01T00:00:00.000Z'),
				},
			],
		} as never)

		const request = new Request(
			'http://localhost/api/negocios/5/annual-payments'
		)
		const response = await GET(request, {
			params: Promise.resolve({ id: '5' }),
		})
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data.businessId).toBe(5)
		expect(body.data.installments).toHaveLength(2)
		expect(body.data.installments[0].installmentIndex).toBe(2)
		expect(body.data.installments[0].expectedDate).toBe('2026-06-01T00:00:00.000Z')
		expect(body.data.installments[1].installmentIndex).toBe(1)
		expect(body.data.installments[1].expectedDate).toBe('2025-01-01T00:00:00.000Z')
	})

	it('AGENTE no ve negocio ajeno (404)', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'a@test.com' } } as never)
		mockGetCurrentUserByEmail.mockResolvedValue(
			buildUserWithRole('a@test.com', UserRole.AGENTE) as never
		)
		mockFindFirst.mockResolvedValue(null)

		const request = new Request(
			'http://localhost/api/negocios/99/annual-payments'
		)
		const response = await GET(request, {
			params: Promise.resolve({ id: '99' }),
		})
		const body = await response.json()

		expect(response.status).toBe(404)
		expect(body.data).toBeNull()
	})
})
