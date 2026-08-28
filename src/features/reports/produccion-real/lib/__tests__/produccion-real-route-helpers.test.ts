import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/features/shared/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/report-permissions/services/report-permissions.service', () => ({
	canViewReport: vi.fn(),
}))
vi.mock('@/features/reports/produccion-real/services/produccion-real-scope.service', () => ({
	intersectUserIdsWithViewerScope: vi.fn(),
}))

import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { intersectUserIdsWithViewerScope } from '@/features/reports/produccion-real/services/produccion-real-scope.service'
import { authorizeAndParseProduccionRealExportBody } from '../produccion-real-route-helpers'

function makeRequest(body: unknown) {
	return new Request('http://localhost/api/reports/produccion-real/export', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

const validBody = {
	dateFrom: '2026-04-01',
	dateTo: '2026-04-30',
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(canViewReport).mockResolvedValue(true)
	vi.mocked(intersectUserIdsWithViewerScope).mockResolvedValue([])
})

describe('authorizeAndParseProduccionRealExportBody — read-only export guard', () => {
	it('returns 403 for CONSULTOR (read-only role), independent of category visibility bypass', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: { email: 'consultor@test.com', role: UserRole.CONSULTOR },
		} as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 9,
			email: 'consultor@test.com',
			idCategory: null,
			role: { code: UserRole.CONSULTOR },
			level: null,
		} as never)

		const result = await authorizeAndParseProduccionRealExportBody(
			makeRequest(validBody)
		)

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.response.status).toBe(403)
		}
	})

	it('allows a write-capable role (ADMIN) through', async () => {
		vi.mocked(auth).mockResolvedValue({
			user: { email: 'admin@test.com', role: UserRole.ADMIN },
		} as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			email: 'admin@test.com',
			idCategory: null,
			role: { code: UserRole.ADMIN },
			level: null,
		} as never)

		const result = await authorizeAndParseProduccionRealExportBody(
			makeRequest(validBody)
		)

		expect(result.ok).toBe(true)
	})
})
