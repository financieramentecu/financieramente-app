/**
 * Integration tests for GET /api/negocios — hierarchical visibility
 *
 * RED phase: written before route modifications.
 * These tests verify that the list route correctly scopes results by
 * the authenticated user's hierarchy (self + subordinates).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only modules
vi.mock('server-only', () => ({}))
vi.mock('@/auth', () => ({
	auth: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			count: vi.fn(),
			findMany: vi.fn(),
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
	prismaBusinessListToEntities: vi.fn((b: unknown[]) => b),
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/features/auth/lib/roles'
import { GET } from '@/app/api/negocios/route'

const mockAuth = vi.mocked(auth)
const mockGetCurrentUser = vi.mocked(getCurrentUserByEmail)
const mockCount = vi.mocked(prisma.business.count)
const mockFindMany = vi.mocked(prisma.business.findMany)
const mockUserFindMany = vi.mocked(prisma.user.findMany)

function makeRequest(url = 'http://localhost/api/negocios?page=1&pageSize=10') {
	return new Request(url)
}

function makeSession(email = 'leader@test.com') {
	return { user: { email } }
}

function makeUser(
	idUser: number,
	roleCode: string,
	email = 'leader@test.com'
) {
	return {
		idUser,
		email,
		name: 'Test User',
		idRole: 1,
		role: { code: roleCode },
	}
}

describe('GET /api/negocios — hierarchical visibility', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Default: no businesses
		mockCount.mockResolvedValue(0)
		mockFindMany.mockResolvedValue([])
	})

	describe('ADMIN sees all — no idUser scope', () => {
		it('does NOT apply idUser filter for ADMIN', async () => {
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(makeUser(1, UserRole.ADMIN) as never)
			// Admin: no hierarchy call needed

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)

			// prisma.user.findMany should NOT be called for admin
			expect(mockUserFindMany).not.toHaveBeenCalled()

			// Count and findMany must have been called
			expect(mockCount).toHaveBeenCalledTimes(1)
			// The where clause passed must NOT contain idUser restriction
			const whereArg = mockCount.mock.calls[0][0]?.where
			const whereStr = JSON.stringify(whereArg ?? {})
			expect(whereStr).not.toContain('"idUser"')
		})
	})

	describe('AGENTE (non-ADMIN) sees own + subordinates', () => {
		it('calls getSubordinateUserIds and passes visibleUserIds to where builder', async () => {
			const leaderId = 10
			const subordinateId = 20

			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(
				makeUser(leaderId, UserRole.AGENTE) as never
			)

			// BFS: subordinate reports to leader
			mockUserFindMany.mockResolvedValue([
				{ idUser: leaderId, idUserLeader: null },
				{ idUser: subordinateId, idUserLeader: leaderId },
			] as never)

			mockCount.mockResolvedValue(2)
			mockFindMany.mockResolvedValue([
				{ idBusiness: 1, idUser: leaderId },
				{ idBusiness: 2, idUser: subordinateId },
			] as never)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)

			// Must have called prisma.user.findMany (BFS)
			expect(mockUserFindMany).toHaveBeenCalledTimes(1)

			// where clause must use IN predicate with both IDs
			const whereArg = mockCount.mock.calls[0][0]?.where
			const whereStr = JSON.stringify(whereArg ?? {})
			expect(whereStr).toContain('"in"')
			expect(whereStr).toContain(`${leaderId}`)
			expect(whereStr).toContain(`${subordinateId}`)
		})

		it('AGENTE with no subordinates sees only own businesses', async () => {
			const agentId = 30

			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(
				makeUser(agentId, UserRole.AGENTE) as never
			)

			// No subordinates
			mockUserFindMany.mockResolvedValue([
				{ idUser: agentId, idUserLeader: null },
			] as never)

			mockCount.mockResolvedValue(1)
			mockFindMany.mockResolvedValue([{ idBusiness: 5, idUser: agentId }] as never)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)

			const whereArg = mockCount.mock.calls[0][0]?.where
			const whereStr = JSON.stringify(whereArg ?? {})
			// Must scope to agentId
			expect(whereStr).toContain(`${agentId}`)
		})
	})

	describe('ASISTENTE_GERENCIA_OPERATIVA and ANALISTA_SOPORTE see all (no idUser scope)', () => {
		it('does NOT apply idUser filter for ASISTENTE_GERENCIA_OPERATIVA', async () => {
			const userId = 40
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(
				makeUser(userId, UserRole.ASISTENTE_GERENCIA_OPERATIVA) as never
			)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)
			// No BFS call — sees all businesses like ADMIN
			expect(mockUserFindMany).not.toHaveBeenCalled()
			const whereArg = mockCount.mock.calls[0][0]?.where
			const whereStr = JSON.stringify(whereArg ?? {})
			expect(whereStr).not.toContain('"idUser"')
		})

		it('does NOT apply idUser filter for ANALISTA_SOPORTE', async () => {
			const userId = 41
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(
				makeUser(userId, UserRole.ANALISTA_SOPORTE) as never
			)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)
			expect(mockUserFindMany).not.toHaveBeenCalled()
			const whereArg = mockCount.mock.calls[0][0]?.where
			const whereStr = JSON.stringify(whereArg ?? {})
			expect(whereStr).not.toContain('"idUser"')
		})
	})
})
