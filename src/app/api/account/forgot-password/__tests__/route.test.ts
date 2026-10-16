import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/features/auth/services/account-activation.service', () => ({
	requestPasswordReset: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	AuditAction: { PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED' },
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	getClientIp: (headers: Headers) =>
		headers.get('x-forwarded-for')?.split(',')[0].trim(),
	getUserAgent: (headers: Headers) => headers.get('user-agent') ?? undefined,
}))

vi.mock('@/features/email/lib/password-reset-notification', () => ({
	sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
}))

import { POST } from '../route'
import { requestPasswordReset } from '@/features/auth/services/account-activation.service'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { sendPasswordResetEmail } from '@/features/email/lib/password-reset-notification'
import { resetAccountRateLimiters } from '@/features/auth/lib/account-rate-limiters'

const RAW_TOKEN = 'raw-reset-token-never-in-responses'

function makeRequest(
	body: unknown,
	headers: Record<string, string> = {}
): Request {
	return new Request('http://localhost/api/account/forgot-password', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-forwarded-for': '10.0.0.1',
			'user-agent': 'vitest',
			...headers,
		},
		body: typeof body === 'string' ? body : JSON.stringify(body),
	})
}

const issued = {
	status: 'issued' as const,
	idUser: 7,
	email: 'ana@example.com',
	name: 'Ana',
	rawToken: RAW_TOKEN,
	expiresAt: new Date('2026-10-11T11:00:00Z'),
}

async function snapshot(response: Response) {
	return {
		status: response.status,
		body: await response.text(),
		contentType: response.headers.get('content-type'),
		setCookie: response.headers.get('set-cookie'),
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	resetAccountRateLimiters()
	vi.mocked(requestPasswordReset).mockResolvedValue({ status: 'ignored' })
})

describe('POST /api/account/forgot-password [TM] (AA-08, SEC-04)', () => {
	describe('no user enumeration', () => {
		it('answers 200 { data: { ok: true } } when the account is ineligible', async () => {
			const response = await POST(makeRequest({ email: 'nobody@example.com' }))
			expect(response.status).toBe(200)
			expect(await response.json()).toEqual({ data: { ok: true } })
		})

		it('returns byte-identical responses for issued and ignored outcomes', async () => {
			// ignored covers: unknown, inactive, pending, ssoOnly, no password
			// (the service collapses all of them into the same result)
			const ignoredCases = [
				'unknown@example.com',
				'inactive@example.com',
				'pending@example.com',
				'sso@example.com',
				'nopassword@example.com',
			]
			const snapshots = []
			for (const email of ignoredCases) {
				vi.mocked(requestPasswordReset).mockResolvedValueOnce({
					status: 'ignored',
				})
				snapshots.push(await snapshot(await POST(makeRequest({ email }))))
			}
			vi.mocked(requestPasswordReset).mockResolvedValueOnce(issued)
			snapshots.push(
				await snapshot(await POST(makeRequest({ email: 'ana@example.com' })))
			)

			for (const current of snapshots) {
				expect(current).toEqual(snapshots[0])
			}
			expect(snapshots[0].status).toBe(200)
			expect(snapshots[0].body).not.toContain(RAW_TOKEN)
		})

		it('does not send an email or write an audit row for ignored outcomes', async () => {
			await POST(makeRequest({ email: 'nobody@example.com' }))
			expect(sendPasswordResetEmail).not.toHaveBeenCalled()
			expect(logAuditEvent).not.toHaveBeenCalled()
		})

		it('still answers 200 when the reset email fails to send', async () => {
			vi.mocked(requestPasswordReset).mockResolvedValueOnce(issued)
			vi.mocked(sendPasswordResetEmail).mockResolvedValueOnce({
				success: false,
				error: 'provider down',
			})
			const response = await POST(makeRequest({ email: 'ana@example.com' }))
			expect(response.status).toBe(200)
			expect(await response.json()).toEqual({ data: { ok: true } })
		})

		it('still answers 200 when the email sender rejects', async () => {
			vi.mocked(requestPasswordReset).mockResolvedValueOnce(issued)
			vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce(new Error('x'))
			const response = await POST(makeRequest({ email: 'ana@example.com' }))
			expect(response.status).toBe(200)
		})
	})

	describe('issued outcome', () => {
		it('sends the reset email and audits PASSWORD_RESET_REQUESTED with ip and user agent', async () => {
			vi.mocked(requestPasswordReset).mockResolvedValueOnce(issued)
			await POST(makeRequest({ email: 'Ana@Example.com ' }))

			expect(requestPasswordReset).toHaveBeenCalledWith({
				email: 'Ana@Example.com',
			})
			expect(sendPasswordResetEmail).toHaveBeenCalledWith({
				userName: 'Ana',
				userEmail: 'ana@example.com',
				rawToken: RAW_TOKEN,
			})
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 7,
					email: 'ana@example.com',
					action: 'PASSWORD_RESET_REQUESTED',
					ipAddress: '10.0.0.1',
					userAgent: 'vitest',
				})
			)
		})

		it('never writes the raw token into the audit details', async () => {
			vi.mocked(requestPasswordReset).mockResolvedValueOnce(issued)
			await POST(makeRequest({ email: 'ana@example.com' }))
			expect(JSON.stringify(vi.mocked(logAuditEvent).mock.calls)).not.toContain(
				RAW_TOKEN
			)
		})
	})

	describe('rate limiting (429 independent of account existence)', () => {
		it('blocks the 4th request for the same email from different IPs', async () => {
			const statuses: number[] = []
			for (let index = 0; index < 5; index++) {
				const response = await POST(
					makeRequest(
						{ email: 'ana@example.com' },
						{ 'x-forwarded-for': `10.1.0.${index}` }
					)
				)
				statuses.push(response.status)
			}
			expect(statuses).toEqual([200, 200, 200, 429, 429])
		})

		it('produces the same 429 pattern whether the account exists or not', async () => {
			async function run(email: string, outcome: 'issued' | 'ignored') {
				resetAccountRateLimiters()
				vi.mocked(requestPasswordReset).mockReset()
				vi.mocked(requestPasswordReset).mockResolvedValue(
					outcome === 'issued' ? issued : { status: 'ignored' }
				)
				const statuses: number[] = []
				for (let index = 0; index < 5; index++) {
					const response = await POST(
						makeRequest({ email }, { 'x-forwarded-for': `10.2.0.${index}` })
					)
					statuses.push(response.status)
				}
				return statuses
			}
			expect(await run('exists@example.com', 'issued')).toEqual(
				await run('ghost@example.com', 'ignored')
			)
		})

		it('normalizes the email so case and whitespace share one bucket', async () => {
			const variants = ['a@x.com', 'A@X.COM', ' a@x.com ', 'A@x.com']
			const statuses: number[] = []
			for (const [index, email] of variants.entries()) {
				const response = await POST(
					makeRequest({ email }, { 'x-forwarded-for': `10.3.0.${index}` })
				)
				statuses.push(response.status)
			}
			expect(statuses).toEqual([200, 200, 200, 429])
		})

		it('[TM] spoofed leading x-forwarded-for hops do not evade the IP limit', async () => {
			const statuses: number[] = []
			for (let index = 0; index < 12; index++) {
				const response = await POST(
					makeRequest(
						{ email: `rot${index}@example.com` },
						{ 'x-forwarded-for': `198.51.100.${index}, 203.0.113.50` }
					)
				)
				statuses.push(response.status)
			}
			expect(statuses.slice(10)).toEqual([429, 429])
		})

		it('[TM] prefers x-real-ip over any x-forwarded-for value', async () => {
			const statuses: number[] = []
			for (let index = 0; index < 12; index++) {
				const response = await POST(
					makeRequest(
						{ email: `real${index}@example.com` },
						{
							'x-real-ip': '203.0.113.60',
							'x-forwarded-for': `198.51.100.${index}`,
						}
					)
				)
				statuses.push(response.status)
			}
			expect(statuses.slice(10)).toEqual([429, 429])
		})

		it('blocks one IP that rotates emails', async () => {
			const statuses: number[] = []
			for (let index = 0; index < 12; index++) {
				const response = await POST(
					makeRequest({ email: `user${index}@example.com` })
				)
				statuses.push(response.status)
			}
			expect(statuses.slice(0, 10).every((status) => status === 200)).toBe(true)
			expect(statuses.slice(10)).toEqual([429, 429])
		})

		it('returns 429 with Retry-After and a generic body, without calling the service', async () => {
			let blocked: Response | undefined
			for (let index = 0; index < 4; index++) {
				blocked = await POST(
					makeRequest(
						{ email: 'ana@example.com' },
						{ 'x-forwarded-for': `10.4.0.${index}` }
					)
				)
			}
			expect(blocked?.status).toBe(429)
			expect(
				Number(blocked?.headers.get('retry-after'))
			).toBeGreaterThanOrEqual(1)
			expect(await blocked?.json()).toEqual({
				data: null,
				error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
			})
			expect(requestPasswordReset).toHaveBeenCalledTimes(3)
		})
	})

	describe('input validation', () => {
		it.each([
			['not an email', { email: 'not-an-email' }],
			['missing email', {}],
			['non-string email', { email: 42 }],
			['empty email', { email: '' }],
		])(
			'rejects %s with 400 and does not call the service',
			async (_n, body) => {
				const response = await POST(makeRequest(body))
				expect(response.status).toBe(400)
				expect(await response.json()).toEqual({
					data: null,
					error: 'Correo electrónico inválido',
				})
				expect(requestPasswordReset).not.toHaveBeenCalled()
			}
		)

		it('rejects malformed JSON with 400', async () => {
			const response = await POST(makeRequest('{not json'))
			expect(response.status).toBe(400)
		})
	})

	it('returns a generic 500 when the service fails unexpectedly', async () => {
		vi.mocked(requestPasswordReset).mockRejectedValueOnce(new Error('db down'))
		const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const response = await POST(makeRequest({ email: 'ana@example.com' }))
		expect(response.status).toBe(500)
		expect(await response.json()).toEqual({
			data: null,
			error: 'No se pudo procesar la solicitud',
		})
		spy.mockRestore()
	})
})
