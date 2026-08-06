/**
 * Integration-style route tests for GET/PUT /api/report-permissions.
 * Services and auth are mocked (no live DB required by harness).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/lib/auth/require-role', () => ({
	requireRole: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		REPORT_PERMISSION_UPDATED: 'REPORT_PERMISSION_UPDATED',
	},
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'vitest'),
}))

vi.mock(
	'@/features/report-permissions/services/report-permissions.service',
	() => ({
		getReportPermissionsCatalog: vi.fn(),
		replaceReportPermissions: vi.fn(),
		ReportPermissionsNotFoundError: class ReportPermissionsNotFoundError extends Error {
			constructor(code: string) {
				super(`Reporte no encontrado: ${code}`)
				this.name = 'ReportPermissionsNotFoundError'
			}
		},
		ReportPermissionsValidationError: class ReportPermissionsValidationError extends Error {
			constructor(message: string) {
				super(message)
				this.name = 'ReportPermissionsValidationError'
			}
		},
	})
)

import { requireRole } from '@/lib/auth/require-role'
import {
	getReportPermissionsCatalog,
	replaceReportPermissions,
} from '@/features/report-permissions/services/report-permissions.service'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { GET, PUT } from '@/app/api/report-permissions/route'

const mockRequireRole = vi.mocked(requireRole)
const mockGetCatalog = vi.mocked(getReportPermissionsCatalog)
const mockReplace = vi.mocked(replaceReportPermissions)

const adminSession = {
	user: {
		id: '1',
		email: 'admin@test.com',
		role: UserRole.ADMIN,
	},
}

const catalog = {
	reports: [
		{
			id: 1,
			code: 'PRODUCCION_REAL',
			name: 'Producción Real',
			description: null,
			routePath: '/dashboard/reportes/produccion-real',
			status: true,
		},
	],
	matrix: {
		report: {
			id: 1,
			code: 'PRODUCCION_REAL',
			name: 'Producción Real',
			description: null,
			routePath: '/dashboard/reportes/produccion-real',
			status: true,
		},
		categories: [
			{ idCategory: 4, name: 'Performance Leader', enabled: true },
		],
	},
}

describe('GET /api/report-permissions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 403 for non-admin', async () => {
		mockRequireRole.mockResolvedValue({
			ok: false,
			response: new Response(null, { status: 403 }) as never,
		})

		const res = await GET(
			new Request('http://localhost/api/report-permissions')
		)
		expect(res.status).toBe(403)
		expect(mockGetCatalog).not.toHaveBeenCalled()
	})

	it('returns catalog for admin', async () => {
		mockRequireRole.mockResolvedValue({
			ok: true,
			session: adminSession,
		} as never)
		mockGetCatalog.mockResolvedValue(catalog)

		const res = await GET(
			new Request('http://localhost/api/report-permissions?code=PRODUCCION_REAL')
		)
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.reports[0].code).toBe('PRODUCCION_REAL')
		expect(mockGetCatalog).toHaveBeenCalledWith('PRODUCCION_REAL')
	})
})

describe('PUT /api/report-permissions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 403 for non-admin', async () => {
		mockRequireRole.mockResolvedValue({
			ok: false,
			response: new Response(null, { status: 403 }) as never,
		})

		const res = await PUT(
			new Request('http://localhost/api/report-permissions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code: 'PRODUCCION_REAL',
					categoryIds: [4],
				}),
			})
		)
		expect(res.status).toBe(403)
		expect(mockReplace).not.toHaveBeenCalled()
	})

	it('updates permissions and audits for admin', async () => {
		mockRequireRole.mockResolvedValue({
			ok: true,
			session: adminSession,
		} as never)
		mockReplace.mockResolvedValue(catalog.matrix)

		const res = await PUT(
			new Request('http://localhost/api/report-permissions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code: 'PRODUCCION_REAL',
					categoryIds: [4],
				}),
			})
		)
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body.data.report.code).toBe('PRODUCCION_REAL')
		expect(mockReplace).toHaveBeenCalledWith('PRODUCCION_REAL', [4])
		expect(logAuditEvent).toHaveBeenCalled()
	})

	it('returns 400 when categoryIds is empty', async () => {
		mockRequireRole.mockResolvedValue({
			ok: true,
			session: adminSession,
		} as never)

		const res = await PUT(
			new Request('http://localhost/api/report-permissions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code: 'PRODUCCION_REAL',
					categoryIds: [],
				}),
			})
		)

		expect(res.status).toBe(400)
		expect(mockReplace).not.toHaveBeenCalled()
	})
})
