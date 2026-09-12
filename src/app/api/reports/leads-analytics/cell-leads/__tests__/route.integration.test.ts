/**
 * Authz tests for Leads Analytics cell-leads.
 * Overrides vitest.setup `next/server` stub so query URLs work.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { CELL_OWNER_SENTINEL } from '@/features/reports/leads-analytics/lib/cell-owner-filter'

vi.mock('next/server', () => {
	class MockNextRequest {
		nextUrl: URL
		url: string
		constructor(input: string | URL) {
			this.nextUrl = typeof input === 'string' ? new URL(input) : input
			this.url = this.nextUrl.toString()
		}
	}

	function MockNextResponse(body?: BodyInit | null, init?: ResponseInit) {
		return {
			status: init?.status ?? 200,
			headers: new Headers(init?.headers),
			json: async () => body,
		}
	}

	MockNextResponse.json = (
		data: unknown,
		init?: { status?: number; headers?: HeadersInit }
	) => ({
		status: init?.status ?? 200,
		headers: new Headers(init?.headers),
		json: async () => data,
	})

	return {
		NextRequest: MockNextRequest,
		NextResponse: MockNextResponse,
	}
})

vi.mock('@/auth', () => ({
	auth: vi.fn(),
}))

vi.mock('@/features/shared/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))

vi.mock(
	'@/features/report-permissions/services/report-permissions.service',
	() => ({
		canViewReport: vi.fn(),
	})
)

vi.mock('@/features/auth/lib/hierarchy', () => ({
	isHierarchyBypassRole: vi.fn(),
}))

vi.mock('@/features/reports/leads-analytics/lib/leads-analytics-scope', () => ({
	intersectUserIdsWithViewerScope: vi.fn(
		async (userIds: readonly number[]) => [...userIds]
	),
}))

vi.mock(
	'@/features/reports/leads-analytics/services/heatmap-cell-leads.service',
	() => ({
		getHeatmapCellLeads: vi.fn(),
	})
)

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'
import { getHeatmapCellLeads } from '@/features/reports/leads-analytics/services/heatmap-cell-leads.service'
import { GET } from '@/app/api/reports/leads-analytics/cell-leads/route'

const mockAuth = vi.mocked(auth)
const mockGetUser = vi.mocked(getCurrentUserByEmail)
const mockCanView = vi.mocked(canViewReport)
const mockBypass = vi.mocked(isHierarchyBypassRole)
const mockCellLeads = vi.mocked(getHeatmapCellLeads)

function cellRequest(idUser?: string): NextRequest {
	const sp = new URLSearchParams({
		dateFrom: '2026-08-01',
		dateTo: '2026-08-31',
		userIds: '10,11',
		idLeadFunnelColumn: '3',
	})
	if (idUser !== undefined) sp.set('idUser', idUser)
	return new NextRequest(
		`http://localhost/api/reports/leads-analytics/cell-leads?${sp.toString()}`
	)
}

describe('GET /api/reports/leads-analytics/cell-leads', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockAuth.mockResolvedValue({
			user: { email: 'leader@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue({
			idUser: 8,
			idCategory: 4,
			role: { code: UserRole.AGENTE },
			level: { code: 'PERFORMANCE_LEADER' },
		} as never)
		mockCanView.mockResolvedValue(true)
		mockBypass.mockReturnValue(false)
		mockCellLeads.mockResolvedValue({ leads: [], total: 0, isTruncated: false })
	})

	it('returns 403 when the viewer cannot see LEADS_ANALYTICS', async () => {
		mockCanView.mockResolvedValue(false)

		const res = await GET(cellRequest())
		const body = await res.json()

		expect(res.status).toBe(403)
		expect(body.error).toBe('No autorizado para este reporte')
		expect(mockCellLeads).not.toHaveBeenCalled()
	})

	it('passes the intersected userIds and owner filter to the service', async () => {
		const res = await GET(cellRequest('10'))
		expect(res.status).toBe(200)
		expect(mockCellLeads).toHaveBeenCalledWith(
			expect.objectContaining({
				visibleUserIds: [10, 11],
				idLeadFunnelColumn: 3,
				ownerFilter: 10,
			})
		)
	})

	it('treats omitted idUser as all selected owners', async () => {
		await GET(cellRequest())
		expect(mockCellLeads).toHaveBeenCalledWith(
			expect.objectContaining({
				ownerFilter: CELL_OWNER_SENTINEL.ALL,
			})
		)
	})
})
