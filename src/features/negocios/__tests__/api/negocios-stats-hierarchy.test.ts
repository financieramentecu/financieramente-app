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
	})

	describe('ADMIN sees all — no idUser scope in stats', () => {
		it('does NOT apply idUser filter in groupBy where for ADMIN', async () => {
			mockAuth.mockResolvedValue(makeSession() as never)
			mockGetCurrentUser.mockResolvedValue(makeUser(1, UserRole.ADMIN) as never)

			const res = await GET(makeRequest())
			expect(res.status).toBe(200)

			// No BFS for admin
			expect(mockUserFindMany).not.toHaveBeenCalled()

			// groupBy where must NOT have idUser restriction
			const calls = mockGroupBy.mock.calls
			expect(calls.length).toBeGreaterThan(0)
			for (const call of calls) {
				const whereStr = JSON.stringify(call[0]?.where ?? {})
				expect(whereStr).not.toContain('"idUser"')
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

			// All groupBy calls must use IN predicate
			for (const call of mockGroupBy.mock.calls) {
				const whereStr = JSON.stringify(call[0]?.where ?? {})
				expect(whereStr).toContain('"in"')
				expect(whereStr).toContain(`${leaderId}`)
				expect(whereStr).toContain(`${subordinateId}`)
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

			for (const call of mockGroupBy.mock.calls) {
				const whereStr = JSON.stringify(call[0]?.where ?? {})
				expect(whereStr).toContain(`${agentId}`)
			}
		})
	})
})
