import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '../route'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: { findUnique: vi.fn(), update: vi.fn() },
	},
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { BUSINESS_CANCELLED: 'BUSINESS_CANCELLED' },
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))

import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { prisma } from '@/lib/prisma'

function makeRequest(reason = 'motivo de cancelación') {
	return new Request('http://localhost/api/negocios/10/cancel', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ reason }),
	})
}

const params = { params: Promise.resolve({ id: '10' }) }

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(auth).mockResolvedValue({
		user: { email: 'consultor@test.com' },
	} as never)
})

describe('PATCH /api/negocios/[id]/cancel', () => {
	it('returns 403 for CONSULTOR (read-only) — CANCEL_ALLOWED_ROLES already excludes it', async () => {
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
		expect(prisma.business.update).not.toHaveBeenCalled()
	})
})
