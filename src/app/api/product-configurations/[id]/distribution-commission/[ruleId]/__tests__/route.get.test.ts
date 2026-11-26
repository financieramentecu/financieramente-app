import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET } from '../route'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'

const prismaCall = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
	prisma: new Proxy(
		{},
		{ get: () => new Proxy({}, { get: () => prismaCall }) }
	),
}))
vi.mock('@/lib/auth/nextauth')

const mockAuth = vi.mocked(auth)
const request = {
	url: 'http://localhost/api/product-configurations/1/distribution-commission/2',
} as unknown as NextRequest
const props = { params: Promise.resolve({ id: '1', ruleId: '2' }) }

describe('GET /api/product-configurations/[id]/distribution-commission/[ruleId]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 without a session and never reaches Prisma', async () => {
		mockAuth.mockResolvedValue(null as never)

		const res = await GET(request, props)

		expect(res.status).toBe(401)
		expect(prismaCall).not.toHaveBeenCalled()
	})

	it('reaches Prisma for any authenticated role', async () => {
		mockAuth.mockResolvedValue({
			user: { id: '1', email: 'agent@test.com', role: UserRole.AGENTE },
		} as never)

		await GET(request, props)

		expect(prismaCall).toHaveBeenCalled()
	})
})
