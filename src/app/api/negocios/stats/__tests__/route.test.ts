import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { NextRequest } from 'next/server'
import { UserRole } from '@/features/auth/lib/roles'
import {
	createMockUserWithRole,
	mockAgentUser,
} from '@/features/shared/__tests__/fixtures/mockUserWithRole'

vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			groupBy: vi.fn(),
			count: vi.fn(),
		},
		currency: {
			findMany: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/services/user.service')
vi.mock('next/server', async (importOriginal) => {
	const actual = await importOriginal<typeof import('next/server')>()
	return {
		...actual,
		NextResponse: {
			json: vi.fn((data, init) => ({
				json: () => Promise.resolve(data),
				status: init?.status ?? 200,
			})),
		},
	}
})

const BASE_URL = 'http://localhost/api/negocios/stats'

function makeRequest(params: Record<string, string> = {}): NextRequest {
	const url = new URL(BASE_URL)
	Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
	return new NextRequest(url)
}

describe('GET /api/negocios/stats', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockGroupBy = vi.mocked(prisma.business.groupBy)
	const mockCount = vi.mocked(prisma.business.count)
	const mockCurrencyFindMany = vi.mocked(prisma.currency.findMany)

	const currencies = [
		{ idCurrency: 1, symbol: 'COP', name: 'Peso Colombiano' },
		{ idCurrency: 2, symbol: 'USD', name: 'Dolar' },
	]

	beforeEach(() => {
		vi.clearAllMocks()
		mockCurrencyFindMany.mockResolvedValue(currencies as never)
		// Default groupBy returns empty, default count returns 0
		mockGroupBy.mockResolvedValue([])
		mockCount.mockResolvedValue(0)
	})

	it('returns 401 when no session', async () => {
		mockAuth.mockResolvedValue(null)
		const res = await GET(makeRequest())
		expect(res.status).toBe(401)
	})

	it('returns 404 when user not found', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'a@b.com' } } as never)
		mockGetCurrentUserByEmail.mockResolvedValue(null)
		const res = await GET(makeRequest())
		expect(res.status).toBe(404)
	})

	describe('as admin (no date filter)', () => {
		beforeEach(() => {
			mockAuth.mockResolvedValue({ user: { email: 'admin@b.com' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(
				createMockUserWithRole(UserRole.ADMIN) as never
			)
		})

		it('calls groupBy 3 times with no createdAt filter when no dates provided', async () => {
			await GET(makeRequest())
			expect(mockGroupBy).toHaveBeenCalledTimes(3)
			const calls = mockGroupBy.mock.calls
			calls.forEach((call) => {
				expect(call[0].where).not.toHaveProperty('createdAt')
			})
		})

		it('applies createdAt filter to ALL 3 KPIs when dateFrom and dateTo are provided', async () => {
			await GET(makeRequest({ dateFrom: '2026-04-01', dateTo: '2026-04-30' }))
			expect(mockGroupBy).toHaveBeenCalledTimes(3)
			const calls = mockGroupBy.mock.calls
			calls.forEach((call) => {
				expect(call[0].where).toMatchObject({
					createdAt: expect.objectContaining({
						gte: expect.any(Date),
						lte: expect.any(Date),
					}),
				})
			})
		})

		it('does NOT apply createdAt filter when only dateFrom is provided', async () => {
			await GET(makeRequest({ dateFrom: '2026-04-01' }))
			const calls = mockGroupBy.mock.calls
			calls.forEach((call) => {
				expect(call[0].where).not.toHaveProperty('createdAt')
			})
		})
	})

	describe('as agent (scoped by user)', () => {
		beforeEach(() => {
			mockAuth.mockResolvedValue({ user: { email: 'agent@b.com' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser as never)
		})

		it('scopes all 3 KPI queries to the agent idUser', async () => {
			await GET(makeRequest({ dateFrom: '2026-04-01', dateTo: '2026-04-30' }))
			const calls = mockGroupBy.mock.calls
			calls.forEach((call) => {
				expect(call[0].where).toMatchObject({
					idUser: mockAgentUser.idUser,
				})
			})
		})

		it('applies createdAt filter to all 3 KPIs when dates given', async () => {
			await GET(makeRequest({ dateFrom: '2026-04-01', dateTo: '2026-04-30' }))
			const calls = mockGroupBy.mock.calls
			calls.forEach((call) => {
				expect(call[0].where).toHaveProperty('createdAt')
			})
		})
	})

	describe('aggregate calculation', () => {
		beforeEach(() => {
			mockAuth.mockResolvedValue({ user: { email: 'admin@b.com' } } as never)
			mockGetCurrentUserByEmail.mockResolvedValue(
				createMockUserWithRole(UserRole.ADMIN) as never
			)
		})

		it('sums COP values into totalCop and USD into totalUsd', async () => {
			mockGroupBy
				.mockResolvedValueOnce([
					{ idCurrency: 1, _count: { idBusiness: 3 }, _sum: { value: { toNumber: () => 1500000 } } },
				] as never)
				.mockResolvedValueOnce([
					{ idCurrency: 2, _count: { idBusiness: 1 }, _sum: { value: { toNumber: () => 500 } } },
				] as never)
				.mockResolvedValueOnce([])

			const res = await GET(makeRequest())
			const body = await res.json()

			expect(body.data.ventasEfectuadas).toEqual({ count: 3, totalCop: 1500000, totalUsd: 0 })
			expect(body.data.emitidos).toEqual({ count: 1, totalCop: 0, totalUsd: 500, sinSoporte: 0 })
			expect(body.data.fondeados).toEqual({ count: 0, totalCop: 0, totalUsd: 0 })
		})

		it('handles null _sum.value without NaN', async () => {
			mockGroupBy.mockResolvedValue([
				{ idCurrency: 1, _count: { idBusiness: 2 }, _sum: { value: null } },
			] as never)

			const res = await GET(makeRequest())
			const body = await res.json()

			expect(body.data.ventasEfectuadas.totalCop).toBe(0)
			expect(body.data.ventasEfectuadas.count).toBe(2)
		})
	})
})
