import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { prisma } from '@/lib/prisma'
import { createLeadFunnelColumn } from '@/features/leads/services/lead-funnel-column.service'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadFunnelColumn: {
			findMany: vi.fn(),
		},
	},
}))
vi.mock('@/features/leads/services/lead-funnel-column.service', () => ({
	createLeadFunnelColumn: vi.fn(),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

function buildPostRequest(body: unknown) {
	return new Request('http://localhost:3000/api/leads/funnel-columns', {
		method: 'POST',
		body: JSON.stringify(body),
	})
}

describe('GET/POST /api/leads/funnel-columns', () => {
	beforeEach(() => vi.clearAllMocks())

	it('GET requires authentication', async () => {
		vi.mocked(auth).mockResolvedValue(null)
		const response = await GET()
		expect(response.status).toBe(401)
	})

	it('GET lists columns for an admin', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'admin@x.com' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			role: { code: 'ADMIN' },
		} as never)
		vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([])

		const response = await GET()
		expect(response.status).toBe(200)
	})

	it('POST rejects a non-admin role with 403', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'agent@x.com' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 2,
			role: { code: 'AGENTE' },
		} as never)

		const response = await POST(
			buildPostRequest({ name: 'Ganado', externalStatusKey: 'won', position: 1 })
		)
		expect(response.status).toBe(403)
		expect(createLeadFunnelColumn).not.toHaveBeenCalled()
	})

	it('POST creates a column for an admin', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'admin@x.com' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			role: { code: 'ADMIN' },
		} as never)
		vi.mocked(createLeadFunnelColumn).mockResolvedValue({
			data: { idLeadFunnelColumn: 5 },
		} as never)

		const response = await POST(
			buildPostRequest({ name: 'Ganado', externalStatusKey: 'won', position: 1 })
		)
		expect(response.status).toBe(201)
	})
})
