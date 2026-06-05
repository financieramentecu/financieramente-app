import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/auth'
import { listDistinctTerms } from '@/features/negocios/services/business-terms.service'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/business-terms.service')
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data: unknown, init?: { status?: number }) => ({
			json: () => Promise.resolve(data),
			status: init?.status ?? 200,
		})),
	},
}))

describe('GET /api/negocios/terms', () => {
	const mockAuth = vi.mocked(auth)
	const mockListDistinctTerms = vi.mocked(listDistinctTerms)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns distinct term numbers when authenticated', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'admin@test.com' } } as never)
		mockListDistinctTerms.mockResolvedValue([1, 2, 3, 5, 10])

		const request = new Request('http://localhost:3000/api/negocios/terms')
		const response = await GET(request)
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data).toEqual([1, 2, 3, 5, 10])
		expect(mockListDistinctTerms).toHaveBeenCalledTimes(1)
	})

	it('returns 401 when unauthenticated', async () => {
		mockAuth.mockResolvedValue(null as never)

		const request = new Request('http://localhost:3000/api/negocios/terms')
		const response = await GET(request)
		const body = await response.json()

		expect(response.status).toBe(401)
		expect(body.data).toBeNull()
		expect(mockListDistinctTerms).not.toHaveBeenCalled()
	})

	it('returns 401 when session has no email', async () => {
		mockAuth.mockResolvedValue({ user: {} } as never)

		const request = new Request('http://localhost:3000/api/negocios/terms')
		const response = await GET(request)

		expect(response.status).toBe(401)
		expect(mockListDistinctTerms).not.toHaveBeenCalled()
	})
})
