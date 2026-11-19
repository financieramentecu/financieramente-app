import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { isValidApiKey } from '@/features/leads/lib/api-key-guard'
import { checkRateLimit } from '@/features/leads/lib/rate-limiter'
import { upsertLeadFromCrm } from '@/features/leads/services/lead-sync.service'
import { ingestLeadFormSubmission } from '@/features/leads/services/lead-form-submission.service'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'

vi.mock('@/features/leads/lib/api-key-guard', () => ({
	isValidApiKey: vi.fn(),
}))
vi.mock('@/features/leads/lib/rate-limiter', () => ({
	checkRateLimit: vi.fn(),
}))
vi.mock('@/features/leads/services/lead-sync.service', () => ({
	upsertLeadFromCrm: vi.fn(),
}))
vi.mock('@/features/leads/services/lead-form-submission.service', () => ({
	ingestLeadFormSubmission: vi.fn(),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		LEAD_FORM_SUBMISSION_REJECTED: 'LEAD_FORM_SUBMISSION_REJECTED',
	},
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

function buildRequest(
	body: unknown,
	headers: Record<string, string> = {},
	url = 'http://localhost:3000/api/leads/crm-sync'
) {
	return new Request(url, {
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
		vi.mocked(upsertLeadFromCrm).mockResolvedValue({ idLead: 1, created: true, origin: null })

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
		vi.mocked(upsertLeadFromCrm).mockResolvedValue({ idLead: 1, created: false, origin: null })

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
		vi.mocked(upsertLeadFromCrm).mockResolvedValue({ idLead: 2, created: true, origin: null })

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

	it('forwards utm_source from the query string when the body omits it', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)
		vi.mocked(upsertLeadFromCrm).mockResolvedValue({
			idLead: 3,
			created: true,
			origin: { code: 'money_map', name: 'Money Map' },
		})

		const response = await POST(
			buildRequest(
				{ externalCrmId: 'crm-1', statusKey: 'new' },
				{ 'x-api-key': 'valid' },
				'http://localhost:3000/api/leads/crm-sync?utm_source=Money%20Map'
			)
		)

		expect(response.status).toBe(200)
		expect(upsertLeadFromCrm).toHaveBeenCalledWith(
			expect.objectContaining({ utm_source: 'Money Map' })
		)
	})

	it('stores a landing form on the same endpoint and returns the submission id', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)
		vi.mocked(ingestLeadFormSubmission).mockResolvedValue({
			idLead: 9,
			created: true,
			submissionId: 'cdt:77ab',
		})

		const response = await POST(
			buildRequest(
				{
					submissionId: 'cdt:77ab',
					submittedAt: '2026-11-18T14:02:00-05:00',
					landing: { key: 'cdt', name: 'CDT', version: '1' },
					lead: { statusKey: 'nuevo', name: 'Luis', email: 'luis@correo.com' },
					fields: [{ key: 'monto', label: 'Valor', type: 'number', value: 0 }],
				},
				{ 'x-api-key': 'valid' }
			)
		)
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data).toEqual({ idLead: 9, created: true, submissionId: 'cdt:77ab' })
		expect(upsertLeadFromCrm).not.toHaveBeenCalled()
	})

	it('fills utm_source on a landing form from the query string', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)
		vi.mocked(ingestLeadFormSubmission).mockResolvedValue({
			idLead: 9,
			created: true,
			submissionId: 'cdt:77ab',
		})

		const response = await POST(
			buildRequest(
				{
					submissionId: 'cdt:77ab',
					submittedAt: '2026-11-18T14:02:00-05:00',
					landing: { key: 'cdt', name: 'CDT', version: '1' },
					lead: { statusKey: 'nuevo', name: 'Luis', email: 'luis@correo.com' },
					fields: [{ key: 'monto', label: 'Valor', type: 'number', value: 0 }],
				},
				{ 'x-api-key': 'valid' },
				'http://localhost:3000/api/leads/crm-sync?utm_source=Money%20Map'
			)
		)

		expect(response.status).toBe(200)
		expect(ingestLeadFormSubmission).toHaveBeenCalledWith(
			expect.objectContaining({ utm_source: 'Money Map' })
		)
	})

	it('rejects an invalid form and does not store a partial lead', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)

		const response = await POST(
			buildRequest(
				{
					submissionId: 'cdt:77ab',
					submittedAt: '2026-11-18T14:02:00-05:00',
					landing: { key: 'cdt', name: 'CDT', version: '1' },
					lead: { statusKey: 'nuevo' },
					fields: [{ key: 'adjunto', label: 'Adjunto', type: 'file', value: 'a.pdf' }],
				},
				{ 'x-api-key': 'valid' }
			)
		)

		expect(response.status).toBe(400)
		expect(ingestLeadFormSubmission).not.toHaveBeenCalled()
		expect(logAuditEvent).toHaveBeenCalled()
	})
})
