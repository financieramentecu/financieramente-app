/**
 * Integration-style authz tests for Leads Analytics.
 * Overrides vitest.setup `next/server` stub so query URLs work.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'

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
	getAccessibleUserIds: vi.fn(),
	isHierarchyBypassRole: vi.fn(),
}))

vi.mock(
	'@/features/reports/leads-analytics/services/leads-analytics.service',
	() => ({
		getLeadsAnalyticsReport: vi.fn(),
	})
)

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import {
	getAccessibleUserIds,
	isHierarchyBypassRole,
} from '@/features/auth/lib/hierarchy'
import { getLeadsAnalyticsReport } from '@/features/reports/leads-analytics/services/leads-analytics.service'
import { GET } from '@/app/api/reports/leads-analytics/route'
import { EMPTY_LEADS_ANALYTICS_REPORT } from '@/features/reports/leads-analytics/lib/empty-report'

const mockAuth = vi.mocked(auth)
const mockGetUser = vi.mocked(getCurrentUserByEmail)
const mockCanView = vi.mocked(canViewReport)
const mockAccessible = vi.mocked(getAccessibleUserIds)
const mockBypass = vi.mocked(isHierarchyBypassRole)
const mockReport = vi.mocked(getLeadsAnalyticsReport)

function reportRequest(
	from = '2026-08-01',
	to = '2026-08-31'
): NextRequest {
	return new NextRequest(
		`http://localhost/api/reports/leads-analytics?dateFrom=${from}&dateTo=${to}`
	)
}

describe('GET /api/reports/leads-analytics', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 403 when the viewer cannot see LEADS_ANALYTICS', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'agent@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue({
			idUser: 5,
			idCategory: 1,
			role: { code: UserRole.AGENTE },
		} as never)
		mockCanView.mockResolvedValue(false)

		const res = await GET(reportRequest())
		const body = await res.json()

		expect(res.status).toBe(403)
		expect(body.error).toBe('No autorizado para este reporte')
		expect(mockCanView).toHaveBeenCalledWith(
			expect.objectContaining({ idCategory: 1 }),
			REPORT_CODES.LEADS_ANALYTICS
		)
		expect(mockReport).not.toHaveBeenCalled()
	})

	it('returns 200 with report data for an authorized Performance Leader', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'leader@test.com', role: UserRole.AGENTE },
		} as never)
		mockGetUser.mockResolvedValue({
			idUser: 8,
			idCategory: 4,
			role: { code: UserRole.AGENTE },
		} as never)
		mockCanView.mockResolvedValue(true)
		mockBypass.mockReturnValue(false)
		mockAccessible.mockResolvedValue([8, 10, 11])
		mockReport.mockResolvedValue(EMPTY_LEADS_ANALYTICS_REPORT)

		const res = await GET(reportRequest())
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.converted.total).toBe(0)
		expect(mockReport).toHaveBeenCalledWith(
			expect.objectContaining({
				range: { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
				visibleUserIds: [8, 10, 11],
				isBypass: false,
			})
		)
	})
})
