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
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

vi.mock('@/auth')
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			count: vi.fn(),
			groupBy: vi.fn(),
		},
		currency: {
			findMany: vi.fn(),
		},
		user: {
			findMany: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/services/user.service')
vi.mock('@/features/negocios/services/user-hierarchy.service', () => ({
	resolveVisibleUserIds: vi.fn().mockResolvedValue(undefined),
	getSubordinateUserIds: vi.fn().mockResolvedValue([]),
}))
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

function makeRequest(
	params: Record<string, string | string[]> = {}
): NextRequest {
	const url = new URL(BASE_URL)
	Object.entries(params).forEach(([k, v]) => {
		if (Array.isArray(v)) {
			v.forEach((item) => url.searchParams.append(k, item))
		} else {
			url.searchParams.set(k, v)
		}
	})
	return new NextRequest(url)
}

describe('GET /api/negocios/stats (COM-73)', () => {
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
		mockGroupBy.mockResolvedValue([])
		mockCount.mockResolvedValue(0)
		mockAuth.mockResolvedValue({ user: { email: 'admin@b.com' } } as never)
		mockGetCurrentUserByEmail.mockResolvedValue(
			createMockUserWithRole(UserRole.ADMIN) as never
		)
	})

	it('returns 401 when no session', async () => {
		mockAuth.mockResolvedValue(null)
		const res = await GET(makeRequest())
		expect(res.status).toBe(401)
	})

	it('returns 404 when user not found', async () => {
		mockGetCurrentUserByEmail.mockResolvedValue(null)
		const res = await GET(makeRequest())
		expect(res.status).toBe(404)
	})

	it('returns zeros when no matching businesses (CA3)', async () => {
		const res = await GET(makeRequest())
		const body = await res.json()
		expect(body.data).toEqual({
			ventasEfectuadas: { count: 0, totalCop: 0, totalUsd: 0 },
			emitidos: { count: 0, totalCop: 0, totalUsd: 0, sinSoporte: 0 },
			fondeados: { count: 0, totalCop: 0, totalUsd: 0 },
		})
	})

	it('applies dateFrom/dateTo as dateAnchored (parity with list)', async () => {
		await GET(makeRequest({ dateFrom: '2026-04-01', dateTo: '2026-04-30' }))
		expect(mockGroupBy).toHaveBeenCalled()
		const whereArg = mockGroupBy.mock.calls[0]?.[0]?.where as {
			AND?: unknown[]
		}
		expect(JSON.stringify(whereArg)).toContain('dateAnchored')
		expect(JSON.stringify(whereArg)).not.toMatch(/"createdAt":\{/)
	})

	it('applies createdFrom/createdTo as createdAt', async () => {
		await GET(
			makeRequest({ createdFrom: '2026-04-01', createdTo: '2026-04-30' })
		)
		const whereArg = mockGroupBy.mock.calls[0]?.[0]?.where
		expect(JSON.stringify(whereArg)).toContain('createdAt')
	})

	it('applies advanced catalog filters (companyIds, statuses)', async () => {
		await GET(
			makeRequest({
				companyIds: ['5'],
				statuses: [BUSINESS_STATUS.EMITIDO],
			})
		)
		const whereArg = mockGroupBy.mock.calls[0]?.[0]?.where
		const whereStr = JSON.stringify(whereArg)
		expect(whereStr).toContain('"idCompany":{"in":[5]}')
		expect(whereStr).toContain(BUSINESS_STATUS.EMITIDO)
	})

	it('sums COP into totalCop and USD into totalUsd', async () => {
		mockGroupBy.mockResolvedValue([
			{
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
				idCurrency: 1,
				_count: { idBusiness: 2 },
				_sum: { value: 1_000_000 },
			},
			{
				status: BUSINESS_STATUS.VENTA_EFECTUADA,
				idCurrency: 2,
				_count: { idBusiness: 1 },
				_sum: { value: 500 },
			},
		] as never)

		const res = await GET(makeRequest())
		const body = await res.json()
		expect(body.data.ventasEfectuadas).toEqual({
			count: 3,
			totalCop: 1_000_000,
			totalUsd: 500,
		})
	})

	it('scopes agent KPIs via resolveVisibleUserIds', async () => {
		const { resolveVisibleUserIds } = await import(
			'@/features/negocios/services/user-hierarchy.service'
		)
		vi.mocked(resolveVisibleUserIds).mockResolvedValue([mockAgentUser.idUser])
		mockAuth.mockResolvedValue({ user: { email: 'agent@b.com' } } as never)
		mockGetCurrentUserByEmail.mockResolvedValue(mockAgentUser as never)

		await GET(makeRequest())
		expect(resolveVisibleUserIds).toHaveBeenCalled()
		const whereArg = mockGroupBy.mock.calls[0]?.[0]?.where
		expect(JSON.stringify(whereArg)).toContain(`"in":[${mockAgentUser.idUser}]`)
	})
})
