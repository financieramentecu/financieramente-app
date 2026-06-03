import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/auth'
import { listPeriodicities } from '@/features/negocios/services/periodicity.service'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/periodicity.service')
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data: unknown, init?: { status?: number }) => ({
			json: () => Promise.resolve(data),
			status: init?.status ?? 200,
		})),
	},
}))

describe('GET /api/periodicities', () => {
	const mockAuth = vi.mocked(auth)
	const mockListPeriodicities = vi.mocked(listPeriodicities)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns ordered catalog when authenticated', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'admin@test.com' } } as never)
		mockListPeriodicities.mockResolvedValue([
			{ id: 1, name: 'Anual' },
			{ id: 2, name: 'Mensual' },
			{ id: 3, name: 'Semestral' },
		])

		const request = new Request('http://localhost:3000/api/periodicities')
		const response = await GET(request)
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data).toEqual([
			{ id: 1, name: 'Anual' },
			{ id: 2, name: 'Mensual' },
			{ id: 3, name: 'Semestral' },
		])
		expect(mockListPeriodicities).toHaveBeenCalledTimes(1)
	})

	it('returns 401 when unauthenticated', async () => {
		mockAuth.mockResolvedValue(null as never)

		const request = new Request('http://localhost:3000/api/periodicities')
		const response = await GET(request)
		const body = await response.json()

		expect(response.status).toBe(401)
		expect(body.data).toBeNull()
		expect(mockListPeriodicities).not.toHaveBeenCalled()
	})

	it('returns 401 when session has no email', async () => {
		mockAuth.mockResolvedValue({ user: {} } as never)

		const request = new Request('http://localhost:3000/api/periodicities')
		const response = await GET(request)

		expect(response.status).toBe(401)
		expect(mockListPeriodicities).not.toHaveBeenCalled()
	})
})
