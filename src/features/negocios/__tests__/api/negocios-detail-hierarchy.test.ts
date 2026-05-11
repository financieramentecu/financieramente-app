/**
 * Integration tests for GET /api/negocios/[id] — hierarchical visibility
 *
 * RED phase: written before route modifications.
 * Tests verify that the detail route allows leaders to see subordinates'
 * businesses while still blocking unrelated users.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/auth', () => ({
	auth: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findFirst: vi.fn(),
		},
		user: {
			findMany: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper', () => ({
	prismaBusinessToEntity: vi.fn((b: unknown) => b),
}))
// Mock heavy dependencies used by PUT (not under test here)
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service', () => ({
	recalcularComisionesPorCambioOrigen: vi.fn(),
	sincronizarYCalcularRegistroRezagado: vi.fn(),
}))
vi.mock('@/features/negocios/services/product-configuration.service', () => ({
	validateProductConfigurationExists: vi.fn(),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { BUSINESS_UPDATED: 'BUSINESS_UPDATED' },
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test-agent'),
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/features/auth/lib/roles'
import { GET } from '@/app/api/negocios/[id]/route'

const mockAuth = vi.mocked(auth)
const mockGetCurrentUser = vi.mocked(getCurrentUserByEmail)
const mockFindFirst = vi.mocked(prisma.business.findFirst)
const mockUserFindMany = vi.mocked(prisma.user.findMany)

function makeRequest() {
	return new Request('http://localhost/api/negocios/1')
}

function makeParams(id = '1') {
	return { params: Promise.resolve({ id }) }
}

function makeSession(email = 'user@test.com') {
	return { user: { email } }
}

function makeUser(idUser: number, roleCode: string) {
	return {
		idUser,
		email: 'user@test.com',
		name: 'Test',
		idRole: 1,
		role: { code: roleCode },
	}
}

// A minimal business shape that passes prismaBusinessToEntity mock
const makeBusiness = (idBusiness: number, idUser: number) => ({
	idBusiness,
	idUser,
	status: 'VENTA_EFECTUADA',
	contract: null,
	value: 1000,
	createdAt: new Date(),
	updatedAt: new Date(),
	idCurrency: 1,
	dateAnchored: null,
	dateIssued: null,
	idClient: 1,
	idProductPercentageCommission: 1,
	client: { idClient: 1, name: 'Test', lastName: 'Client', identityNumber: '123', email: null },
	productPercentageCommission: null,
	payments: [],
})

describe('GET /api/negocios/[id] — hierarchical visibility', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('ADMIN always sees any business', () => {
		it('returns business without idUser restriction for ADMIN', async () => {
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(makeUser(1, UserRole.ADMIN) as never)
			mockFindFirst.mockResolvedValue(makeBusiness(1, 99) as never)

			const res = await GET(makeRequest(), makeParams('1'))
			expect(res.status).toBe(200)

			// No BFS for admin
			expect(mockUserFindMany).not.toHaveBeenCalled()

			// findFirst called without idUser restriction
			const whereArg = mockFindFirst.mock.calls[0][0]?.where
			expect(whereArg).not.toHaveProperty('idUser')
			expect(whereArg).toEqual(expect.objectContaining({ idBusiness: 1 }))
		})
	})

	describe('AGENTE sees own business', () => {
		it('returns 200 for own business', async () => {
			const agentId = 10
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(makeUser(agentId, UserRole.AGENTE) as never)

			mockUserFindMany.mockResolvedValue([
				{ idUser: agentId, idUserLeader: null },
			] as never)
			mockFindFirst.mockResolvedValue(makeBusiness(1, agentId) as never)

			const res = await GET(makeRequest(), makeParams('1'))
			expect(res.status).toBe(200)
		})

		it('returns 404 when business belongs to unrelated user', async () => {
			const agentId = 10
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(makeUser(agentId, UserRole.AGENTE) as never)

			// No subordinates, business not found because idUser filter excludes it
			mockUserFindMany.mockResolvedValue([
				{ idUser: agentId, idUserLeader: null },
			] as never)
			mockFindFirst.mockResolvedValue(null)

			const res = await GET(makeRequest(), makeParams('1'))
			expect(res.status).toBe(404)
		})
	})

	describe('AGENTE leader sees subordinate business', () => {
		it('returns 200 when business belongs to direct subordinate', async () => {
			const leaderId = 10
			const subordinateId = 20

			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(makeUser(leaderId, UserRole.AGENTE) as never)

			// BFS: subordinate reports to leader
			mockUserFindMany.mockResolvedValue([
				{ idUser: leaderId, idUserLeader: null },
				{ idUser: subordinateId, idUserLeader: leaderId },
			] as never)

			// Business belongs to subordinate — found because IN predicate includes subordinateId
			mockFindFirst.mockResolvedValue(makeBusiness(1, subordinateId) as never)

			const res = await GET(makeRequest(), makeParams('1'))
			expect(res.status).toBe(200)

			// findFirst must use IN predicate including both leaderId and subordinateId
			const whereArg = mockFindFirst.mock.calls[0][0]?.where
			const whereStr = JSON.stringify(whereArg ?? {})
			expect(whereStr).toContain('"in"')
			expect(whereStr).toContain(`${leaderId}`)
			expect(whereStr).toContain(`${subordinateId}`)
		})
	})
})
