import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
// The global setup stubs NextRequest; these routes need the real one to parse query params.
vi.mock('next/server', async (importOriginal) => {
	const actual = await importOriginal<typeof import('next/server')>()
	return {
		...actual,
		NextResponse: {
			json: vi.fn((data: unknown, init?: { status?: number }) => ({
				json: () => Promise.resolve(data),
				status: init?.status ?? 200,
			})),
		},
	}
})
vi.mock(
	'@/features/production-dashboard/services/production-kpi.service',
	() => ({
		getProductionKpiRaw: vi.fn().mockResolvedValue({}),
	})
)
vi.mock('@/features/production-dashboard/services/by-status.service', () => ({
	getBusinessesByStatusRaw: vi.fn().mockResolvedValue([]),
}))
vi.mock(
	'@/features/production-dashboard/services/company-donut.service',
	() => ({
		getCompanyDonutRaw: vi.fn().mockResolvedValue([]),
	})
)
vi.mock(
	'@/features/production-dashboard/services/origin-donut.service',
	() => ({
		getOriginDonutRaw: vi.fn().mockResolvedValue([]),
	})
)
vi.mock('@/features/production-dashboard/services/ms-chart.service', () => ({
	getMsChartRaw: vi.fn().mockResolvedValue([]),
}))

import { getProductionKpiRaw } from '@/features/production-dashboard/services/production-kpi.service'
import { getBusinessesByStatusRaw } from '@/features/production-dashboard/services/by-status.service'
import { getCompanyDonutRaw } from '@/features/production-dashboard/services/company-donut.service'
import { getOriginDonutRaw } from '@/features/production-dashboard/services/origin-donut.service'
import { getMsChartRaw } from '@/features/production-dashboard/services/ms-chart.service'
import { GET as kpis } from '@/app/api/production-dashboard/kpis/route'
import { GET as byStatus } from '@/app/api/production-dashboard/by-status/route'
import { GET as byCompany } from '@/app/api/production-dashboard/by-company/route'
import { GET as byOrigin } from '@/app/api/production-dashboard/by-origin/route'
import { GET as msChart } from '@/app/api/production-dashboard/ms-chart/route'

const mockAuth = vi.mocked(auth)

function request(path: string, userIds: string): NextRequest {
	const url = new URL(`http://localhost/api/production-dashboard/${path}`)
	url.searchParams.set('userIds', userIds)
	return new NextRequest(url)
}

function sessionFor(role: string, id = '7') {
	return {
		user: { id, role, email: 'u@test.com' },
		expires: '2099-01-01',
	} as unknown as Awaited<ReturnType<typeof auth>>
}

const endpoints = [
	{ name: 'kpis', path: 'kpis', handler: kpis, service: getProductionKpiRaw },
	{
		name: 'by-status',
		path: 'by-status',
		handler: byStatus,
		service: getBusinessesByStatusRaw,
	},
	{
		name: 'by-company',
		path: 'by-company',
		handler: byCompany,
		service: getCompanyDonutRaw,
	},
	{
		name: 'by-origin',
		path: 'by-origin',
		handler: byOrigin,
		service: getOriginDonutRaw,
	},
	{
		name: 'ms-chart',
		path: 'ms-chart',
		handler: msChart,
		service: getMsChartRaw,
	},
] as const

describe.each(endpoints)(
	'GET /api/production-dashboard/$name partner scope',
	({ path, handler, service }) => {
		beforeEach(() => {
			vi.clearAllMocks()
		})

		it('queries only the PARTNER own id even when the client asks for other users', async () => {
			mockAuth.mockResolvedValue(sessionFor('PARTNER', '7'))

			await handler(request(path, '1,2,3,7'))

			expect(service).toHaveBeenCalledTimes(1)
			expect(vi.mocked(service).mock.calls[0][0].userIds).toEqual([7])
		})

		it('does not alter the requested ids for an AGENTE', async () => {
			mockAuth.mockResolvedValue(sessionFor('AGENTE', '3'))

			await handler(request(path, '1,2,3'))

			expect(vi.mocked(service).mock.calls[0][0].userIds).toEqual([1, 2, 3])
		})
	}
)
