import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '../route'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/negocios/services/business-novedad.service', () => ({
	getNovedadContext: vi.fn(),
	updateNovedadStatus: vi.fn(),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { BUSINESS_NOVEDAD_STATUS_CHANGED: 'BUSINESS_NOVEDAD_STATUS_CHANGED' },
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))

import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { updateNovedadStatus } from '@/features/negocios/services/business-novedad.service'

function makeRequest(novedadStatus = 'PENDIENTE') {
	return new Request('http://localhost/api/negocios/10/manage-novedad', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ novedadStatus }),
	})
}

const params = { params: Promise.resolve({ id: '10' }) }

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(auth).mockResolvedValue({
		user: { email: 'consultor@test.com' },
	} as never)
})

describe('PATCH /api/negocios/[id]/manage-novedad', () => {
	it('returns 403 for CONSULTOR (read-only) — MANAGE_NOVEDAD_ALLOWED_ROLES already excludes it', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 9,
			idRole: 6,
			email: 'consultor@test.com',
			role: { code: UserRole.CONSULTOR },
		} as never)

		const res = await PATCH(makeRequest(), params)
		const body = await res.json()

		expect(res.status).toBe(403)
		expect(body.data).toBeNull()
		expect(updateNovedadStatus).not.toHaveBeenCalled()
	})
})
