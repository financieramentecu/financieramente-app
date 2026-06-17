import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock before importing the route
vi.mock('@/features/negocios/services/payment-state.service', () => ({
	fundDuePayments: vi.fn(),
}))
vi.mock('@/features/negocios/lib/bogota-date', () => ({
	todayBogotaNoonUtc: vi.fn(() => new Date('2026-06-15T12:00:00Z')),
}))

import { POST } from '../fund-payments/route'
import { fundDuePayments } from '@/features/negocios/services/payment-state.service'
import { todayBogotaNoonUtc } from '@/features/negocios/lib/bogota-date'

const VALID_SECRET = 'test-cron-secret'

function makeRequest(authHeader?: string): Request {
	const headers: Record<string, string> = {}
	if (authHeader !== undefined) {
		headers['Authorization'] = authHeader
	}
	return new Request('http://localhost/api/negocios/cron/fund-payments', {
		method: 'POST',
		headers,
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	process.env.CRON_SECRET = VALID_SECRET
	vi.mocked(fundDuePayments).mockResolvedValue({ fundedPayments: 3, fondeadoBusinesses: 1 })
})

describe('POST /api/negocios/cron/fund-payments', () => {
	describe('valid Bearer executes funding run', () => {
		it('returns 200 with summary when Bearer matches CRON_SECRET', async () => {
			const req = makeRequest(`Bearer ${VALID_SECRET}`)
			const res = await POST(req)

			expect(res.status).toBe(200)
			const body = await res.json()
			expect(body.data).toBeDefined()
			expect(body.data.fundedPayments).toBe(3)
			expect(body.data.fondeadoBusinesses).toBe(1)
		})

		it('calls fundDuePayments with Bogota today anchored at noon UTC (matches expectedDate anchor)', async () => {
			const req = makeRequest(`Bearer ${VALID_SECRET}`)
			await POST(req)

			expect(fundDuePayments).toHaveBeenCalledOnce()
			expect(fundDuePayments).toHaveBeenCalledWith(new Date('2026-06-15T12:00:00Z'))
			expect(todayBogotaNoonUtc).toHaveBeenCalledOnce()
		})
	})

	describe('missing Authorization header rejected', () => {
		it('returns 401 when no Authorization header', async () => {
			const req = makeRequest(undefined)
			const res = await POST(req)

			expect(res.status).toBe(401)
			expect(fundDuePayments).not.toHaveBeenCalled()
		})
	})

	describe('wrong secret rejected', () => {
		it('returns 401 when Bearer token is wrong', async () => {
			const req = makeRequest('Bearer wrong-secret')
			const res = await POST(req)

			expect(res.status).toBe(401)
			expect(fundDuePayments).not.toHaveBeenCalled()
		})

		it('returns 401 when Authorization is not Bearer scheme', async () => {
			const req = makeRequest(`Basic ${VALID_SECRET}`)
			const res = await POST(req)

			expect(res.status).toBe(401)
			expect(fundDuePayments).not.toHaveBeenCalled()
		})

		it('returns 401 when Bearer token has different length (timing-safe pre-check)', async () => {
			const req = makeRequest('Bearer short')
			const res = await POST(req)

			expect(res.status).toBe(401)
			expect(fundDuePayments).not.toHaveBeenCalled()
		})
	})
})
