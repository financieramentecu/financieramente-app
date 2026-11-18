import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'
import { isValidApiKey } from '@/features/leads/lib/api-key-guard'
import { checkRateLimit } from '@/features/leads/lib/rate-limiter'
import { ingestLeadFormSubmission } from '@/features/leads/services/lead-form-submission.service'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'

vi.mock('@/features/leads/lib/api-key-guard', () => ({ isValidApiKey: vi.fn() }))
vi.mock('@/features/leads/lib/rate-limiter', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/features/leads/services/lead-form-submission.service', () => ({
	ingestLeadFormSubmission: vi.fn(),
	LeadFormSubmissionError: class LeadFormSubmissionError extends Error {},
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	getClientIp: () => '127.0.0.1',
	getUserAgent: () => 'vitest',
	AuditAction: { LEAD_FORM_SUBMISSION_REJECTED: 'LEAD_FORM_SUBMISSION_REJECTED' },
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

const validBody = {
	submissionId: 'cdt:77ab',
	submittedAt: '2026-11-18T14:02:00-05:00',
	landing: { key: 'cdt', name: 'CDT', version: '1' },
	lead: { statusKey: 'nuevo', email: 'luis@correo.com' },
	fields: [{ key: 'monto', label: 'Valor a invertir', type: 'number', value: 5000000 }],
}

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
	return new Request('http://localhost:3000/api/leads/form-submissions', {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body),
	})
}

describe('POST /api/leads/form-submissions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(checkRateLimit).mockReturnValue({ allowed: true })
	})

	it('returns 401 and does not store when the api key is missing', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(false)
		const response = await POST(buildRequest(validBody))
		expect(response.status).toBe(401)
		expect(ingestLeadFormSubmission).not.toHaveBeenCalled()
	})

	it('returns 400 and does not store an invalid contract', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)
		const response = await POST(buildRequest({ submissionId: 'x' }, { 'x-api-key': 'valid' }))
		expect(response.status).toBe(400)
		expect(ingestLeadFormSubmission).not.toHaveBeenCalled()
		expect(logAuditEvent).toHaveBeenCalled()
	})

	it('returns 200 for a valid landing payload', async () => {
		vi.mocked(isValidApiKey).mockReturnValue(true)
		vi.mocked(ingestLeadFormSubmission).mockResolvedValue({ idLead: 4, created: true, replayed: false })
		const response = await POST(buildRequest(validBody, { 'x-api-key': 'valid' }))
		const body = await response.json()
		expect(response.status).toBe(200)
		expect(body.data).toEqual({ idLead: 4, created: true, replayed: false })
	})
})
