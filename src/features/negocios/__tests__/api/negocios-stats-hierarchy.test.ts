/**
 * Integration tests for GET /api/negocios/stats — hierarchical visibility
 *
 * Verifies that stats apply the same scope as the list (via groupBy WHERE).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/auth', () => ({
	auth: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			groupBy: vi.fn(),
			count: vi.fn(),
		},
		user: {
			findMany: vi.fn(),
		},
		currency: {
			findMany: vi.fn(),
		},
	},
}))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/features/auth/lib/roles'
import { GET } from '@/app/api/negocios/stats/route'
import type { NextRequest } from 'next/server'

const mockAuth = vi.mocked(auth)
const mockGetCurrentUser = vi.mocked(getCurrentUserByEmail)
const mockGroupBy = vi.mocked(prisma.business.groupBy)
const mockUserFindMany = vi.mocked(prisma.user.findMany)
const mockCurrencyFindMany = vi.mocked(prisma.currency.findMany)

function makeRequest(url = 'http://localhost/api/negocios/stats'): NextRequest {
	return new Request(url) as unknown as NextRequest
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

describe('GET /api/negocios/stats — hierarchical visibility', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGroupBy.mockResolvedValue([])
		mockCurrencyFindMany.mockResolvedValue([])
		vi.mocked(prisma.business.count).mockResolvedValue(0)
	})

	describe('ADMIN sees all — no idUser scope in stats', () => {
		it('does NOT apply idUser filter in groupBy where for ADMIN', async () => {
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(makeUser(1, UserRole.ADMIN) as never)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)

			expect(mockUserFindMany).not.toHaveBeenCalled()
			expect(mockGroupBy).toHaveBeenCalled()

			const whereStr = JSON.stringify(mockGroupBy.mock.calls[0]?.[0]?.where)
			expect(whereStr).not.toContain('"idUser"')
		})
	})

	describe('AGENTE sees own + subordinates in stats', () => {
		it('applies IN predicate with hierarchy IDs in groupBy where', async () => {
			const leaderId = 10
			const subordinateId = 20

			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(
				makeUser(leaderId, UserRole.AGENTE) as never
			)

			mockUserFindMany.mockResolvedValue([
				{ idUser: leaderId, idUserLeader: null },
				{ idUser: subordinateId, idUserLeader: leaderId },
			] as never)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)

			expect(mockUserFindMany).toHaveBeenCalledTimes(1)
			expect(mockGroupBy).toHaveBeenCalled()

			const whereStr = JSON.stringify(mockGroupBy.mock.calls[0]?.[0]?.where)
			expect(whereStr).toContain('"idUser"')
			expect(whereStr).toContain(`${leaderId}`)
			expect(whereStr).toContain(`${subordinateId}`)
		})

		it('AGENTE with no subordinates scopes stats to own idUser only', async () => {
			const agentId = 5
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(
				makeUser(agentId, UserRole.AGENTE) as never
			)

			mockUserFindMany.mockResolvedValue([
				{ idUser: agentId, idUserLeader: null },
			] as never)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)

			const whereStr = JSON.stringify(mockGroupBy.mock.calls[0]?.[0]?.where)
			expect(whereStr).toContain('"idUser"')
			expect(whereStr).toContain(`${agentId}`)
		})
	})
})
