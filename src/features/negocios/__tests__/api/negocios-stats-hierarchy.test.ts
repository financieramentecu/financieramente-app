/**
 * Integration tests for GET /api/negocios/stats — hierarchical visibility
 *
 * RED phase: written before route modifications.
 * These tests verify that the stats route applies the same scope as the list.
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
		$queryRaw: vi.fn(),
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
const mockQueryRaw = vi.mocked(prisma.$queryRaw)
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
		mockQueryRaw.mockResolvedValue([])
		mockCurrencyFindMany.mockResolvedValue([])
		vi.mocked(prisma.business.count).mockResolvedValue(0)
	})

	describe('ADMIN sees all — no idUser scope in stats', () => {
		it('does NOT apply idUser filter in groupBy where for ADMIN', async () => {
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(makeUser(1, UserRole.ADMIN) as never)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)

			// No BFS for admin
			expect(mockUserFindMany).not.toHaveBeenCalled()

			// queryRaw where must NOT have id_user restriction
			const calls = mockQueryRaw.mock.calls
			expect(calls.length).toBeGreaterThan(0)
			for (const call of calls) {
				const callStr = JSON.stringify(call)
				expect(callStr).not.toContain('id_user IN')
			}
		})
	})

	describe('AGENTE sees own + subordinates in stats', () => {
		it('applies IN predicate with hierarchy IDs in groupBy where', async () => {
			const leaderId = 10
			const subordinateId = 20

			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(makeUser(leaderId, UserRole.AGENTE) as never)

			mockUserFindMany.mockResolvedValue([
				{ idUser: leaderId, idUserLeader: null },
				{ idUser: subordinateId, idUserLeader: leaderId },
			] as never)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)

			expect(mockUserFindMany).toHaveBeenCalledTimes(1)

			// All queryRaw calls must use IN predicate with user ids
			for (const call of mockQueryRaw.mock.calls) {
				const callStr = JSON.stringify(call)
				expect(callStr).toContain('id_user IN')
				
				// Ensure the actual values are in the parameter list (call bounds or values)
				expect(callStr).toContain(`${leaderId}`)
				expect(callStr).toContain(`${subordinateId}`)
			}
		})

		it('AGENTE with no subordinates scopes stats to own idUser only', async () => {
			const agentId = 5
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(makeUser(agentId, UserRole.AGENTE) as never)

			mockUserFindMany.mockResolvedValue([
				{ idUser: agentId, idUserLeader: null },
			] as never)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)

			for (const call of mockQueryRaw.mock.calls) {
				const callStr = JSON.stringify(call)
				expect(callStr).toContain('id_user IN')
				expect(callStr).toContain(`${agentId}`)
			}
		})
	})
})
