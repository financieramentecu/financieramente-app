import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '../route'
import { UserRole } from '@/features/auth/lib/roles'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

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
	AuditAction: {
		BUSINESS_NOVEDAD_MARKED: 'BUSINESS_NOVEDAD_MARKED',
		BUSINESS_NOVEDAD_UNMARKED: 'BUSINESS_NOVEDAD_UNMARKED',
	},
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))

import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { prisma } from '@/lib/prisma'

function makeRequest(action: 'MARK' | 'UNMARK' = 'MARK') {
	return new Request('http://localhost/api/negocios/10/mark-novedad', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action }),
	})
}

const params = { params: Promise.resolve({ id: '10' }) }

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(auth).mockResolvedValue({
		user: { email: 'consultor@test.com' },
	} as never)
	vi.mocked(prisma.business.findUnique).mockResolvedValue({
		idBusiness: 10,
		idUser: 99,
		status: BUSINESS_STATUS.VENTA_EFECTUADA,
		novedadStatus: null,
	} as never)
})

describe('PATCH /api/negocios/[id]/mark-novedad', () => {
	it('returns 403 for CONSULTOR (read-only role) trying to MARK, no state change', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 9,
			idRole: 6,
			email: 'consultor@test.com',
			role: { code: UserRole.CONSULTOR },
		} as never)

		const res = await PATCH(makeRequest('MARK'), params)
		const body = await res.json()

		expect(res.status).toBe(403)
		expect(body.data).toBeNull()
		expect(prisma.business.update).not.toHaveBeenCalled()
	})
})
