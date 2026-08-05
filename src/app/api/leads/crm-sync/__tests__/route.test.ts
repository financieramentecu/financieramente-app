import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { isValidApiKey } from '@/features/leads/lib/api-key-guard'
import { checkRateLimit } from '@/features/leads/lib/rate-limiter'
import { upsertLeadFromCrm } from '@/features/leads/services/lead-sync.service'

vi.mock('@/features/leads/lib/api-key-guard', () => ({
	isValidApiKey: vi.fn(),
}))
vi.mock('@/features/leads/lib/rate-limiter', () => ({
	checkRateLimit: vi.fn(),
}))
vi.mock('@/features/leads/services/lead-sync.service', () => ({
	upsertLeadFromCrm: vi.fn(),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
	return new Request('http://localhost:3000/api/leads/crm-sync', {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body),
	})
}

describe('POST /api/leads/crm-sync', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(checkRateLimit).mockReturnValue({ allowed: true })
	})

	it('returns 401 when the API key header is missing', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(false)

		const response = await POST(
			buildRequest({ externalCrmId: 'x', statusKey: 'new' })
		)
		expect(response.status).toBe(401)
		expect(upsertLeadFromCrm).not.toHaveBeenCalled()
	})

	it('returns 401 when the API key header is invalid', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(false)

		const response = await POST(
			buildRequest(
				{ externalCrmId: 'x', statusKey: 'new' },
				{ 'x-api-key': 'wrong' }
			)
		)
		expect(response.status).toBe(401)
	})

	it('returns 429 when the caller exceeded the rate limit, without touching the payload', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)
		vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, retryAfterSeconds: 30 })

		const response = await POST(
			buildRequest(
				{ externalCrmId: 'x', statusKey: 'new' },
				{ 'x-api-key': 'valid' }
			)
		)
		expect(response.status).toBe(429)
		expect(upsertLeadFromCrm).not.toHaveBeenCalled()
	})

	it('returns 400 when a required field is missing (Zod)', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)

		const response = await POST(
			buildRequest({ statusKey: 'new' }, { 'x-api-key': 'valid' })
		)
		expect(response.status).toBe(400)
		expect(upsertLeadFromCrm).not.toHaveBeenCalled()
	})

	it('returns 200 and creates a lead on a well-formed payload', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)
		vi.mocked(upsertLeadFromCrm).mockResolvedValue({ idLead: 1, created: true })

		const response = await POST(
			buildRequest(
				{ externalCrmId: 'crm-1', statusKey: 'new' },
				{ 'x-api-key': 'valid' }
			)
		)
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data.idLead).toBe(1)
		expect(body.data.created).toBe(true)
	})

	it('is idempotent: reposting the identical payload still returns 200', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)
		vi.mocked(upsertLeadFromCrm).mockResolvedValue({ idLead: 1, created: false })

		const response = await POST(
			buildRequest(
				{ externalCrmId: 'crm-1', statusKey: 'new' },
				{ 'x-api-key': 'valid' }
			)
		)
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data.created).toBe(false)
	})

	it('returns 200 even when ownerEmail is unmatched (never rejects the ingest)', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)
		vi.mocked(upsertLeadFromCrm).mockResolvedValue({ idLead: 2, created: true })

		const response = await POST(
			buildRequest(
				{
					externalCrmId: 'crm-3',
					statusKey: 'new',
					ownerEmail: 'typo@example.com',
				},
				{ 'x-api-key': 'valid' }
			)
		)

		expect(response.status).toBe(200)
	})
})
