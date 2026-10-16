import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/features/auth/services/account-activation.service', () => ({
	activateAccount: vi.fn(),
	resetPassword: vi.fn(),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	AuditAction: {
		ACCOUNT_ACTIVATED: 'ACCOUNT_ACTIVATED',
		PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
	},
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	getClientIp: (headers: Headers) =>
		headers.get('x-forwarded-for')?.split(',')[0].trim(),
	getUserAgent: (headers: Headers) => headers.get('user-agent') ?? undefined,
}))

import * as activateRoute from '../activate/route'
import * as resetRoute from '../reset-password/route'
import {
	activateAccount,
	resetPassword,
} from '@/features/auth/services/account-activation.service'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { resetAccountRateLimiters } from '@/features/auth/lib/account-rate-limiters'

const RAW_TOKEN = 'secret-raw-token-value-0123456789abcdefghij'
const GOOD_PASSWORD = 'Abcdef12!'
const INVALID_LINK = { data: null, error: 'Enlace inválido o vencido' }

const cases = [
	{
		name: 'activate',
		route: activateRoute,
		path: '/api/account/activate',
		service: activateAccount,
		auditAction: 'ACCOUNT_ACTIVATED',
	},
	{
		name: 'reset-password',
		route: resetRoute,
		path: '/api/account/reset-password',
		service: resetPassword,
		auditAction: 'PASSWORD_RESET_COMPLETED',
	},
] as const

function post(path: string, body: unknown, ip = '10.0.0.1'): Request {
	return new Request(`http://localhost${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-forwarded-for': ip,
			'user-agent': 'vitest',
		},
		body: typeof body === 'string' ? body : JSON.stringify(body),
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	resetAccountRateLimiters()
})

describe.each(cases)(
	'POST $path [TM] (AA-04, AA-05, AA-07, SEC-04)',
	({ path, route, service, auditAction }) => {
		it('returns 200 and audits with user, email, ip and user agent on success', async () => {
			vi.mocked(service).mockResolvedValueOnce({
				ok: true,
				idUser: 5,
				email: 'ana@example.com',
			})
			const response = await route.POST(
				post(path, { token: RAW_TOKEN, password: GOOD_PASSWORD })
			)
			expect(response.status).toBe(200)
			expect(await response.json()).toEqual({ data: { ok: true } })
			expect(service).toHaveBeenCalledWith({
				rawToken: RAW_TOKEN,
				password: GOOD_PASSWORD,
			})
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 5,
					email: 'ana@example.com',
					action: auditAction,
					ipAddress: '10.0.0.1',
					userAgent: 'vitest',
				})
			)
			expect(JSON.stringify(vi.mocked(logAuditEvent).mock.calls)).not.toContain(
				RAW_TOKEN
			)
		})

		it('answers the generic 400 for invalid/expired/used/revoked/ineligible tokens and writes no audit row', async () => {
			vi.mocked(service).mockResolvedValueOnce({
				ok: false,
				reason: 'INVALID_TOKEN',
			})
			const response = await route.POST(
				post(path, { token: RAW_TOKEN, password: GOOD_PASSWORD })
			)
			expect(response.status).toBe(400)
			expect(await response.json()).toEqual(INVALID_LINK)
			expect(logAuditEvent).not.toHaveBeenCalled()
		})

		it.each([
			['too short', 'Ab1', 'La contraseña debe tener al menos 8 caracteres'],
			[
				'no digit',
				'Abcdefgh',
				'La contraseña debe contener al menos un número',
			],
			[
				'no letter',
				'12345678',
				'La contraseña debe contener al menos una letra minúscula',
			],
		])(
			'rejects a password that is %s with 400 and the schema message',
			async (_n, password, message) => {
				const response = await route.POST(
					post(path, { token: RAW_TOKEN, password })
				)
				expect(response.status).toBe(400)
				expect(await response.json()).toEqual({ data: null, error: message })
				expect(service).not.toHaveBeenCalled()
			}
		)

		it.each([
			['missing token', { password: GOOD_PASSWORD }],
			['empty token', { token: '', password: GOOD_PASSWORD }],
			['non-string token', { token: 123, password: GOOD_PASSWORD }],
		])('treats %s as the generic invalid link', async (_n, body) => {
			const response = await route.POST(post(path, body))
			expect(response.status).toBe(400)
			expect(await response.json()).toEqual(INVALID_LINK)
			expect(service).not.toHaveBeenCalled()
		})

		it('rejects malformed JSON with 400', async () => {
			const response = await route.POST(post(path, '{nope'))
			expect(response.status).toBe(400)
			expect(service).not.toHaveBeenCalled()
		})

		it('never echoes the token or a hash in any response', async () => {
			vi.mocked(service).mockResolvedValueOnce({
				ok: false,
				reason: 'INVALID_TOKEN',
			})
			const response = await route.POST(
				post(path, { token: RAW_TOKEN, password: GOOD_PASSWORD })
			)
			expect(await response.text()).not.toContain(RAW_TOKEN)
		})

		it('rate limits one IP with 429 and Retry-After, independent of the token', async () => {
			vi.mocked(service).mockResolvedValue({
				ok: false,
				reason: 'INVALID_TOKEN',
			})
			let last: Response | undefined
			for (let index = 0; index < 21; index++) {
				last = await route.POST(
					post(path, { token: `t-${index}`, password: GOOD_PASSWORD })
				)
			}
			expect(last?.status).toBe(429)
			expect(Number(last?.headers.get('retry-after'))).toBeGreaterThanOrEqual(1)
			expect(vi.mocked(service)).toHaveBeenCalledTimes(20)
		})

		it('[TM] keys the limiter on the trusted IP: spoofed leading x-forwarded-for hops do not reset the budget', async () => {
			vi.mocked(service).mockResolvedValue({
				ok: false,
				reason: 'INVALID_TOKEN',
			})
			let last: Response | undefined
			for (let index = 0; index < 21; index++) {
				last = await route.POST(
					post(
						path,
						{ token: `t-${index}`, password: GOOD_PASSWORD },
						`198.51.100.${index}, 203.0.113.9`
					)
				)
			}
			expect(last?.status).toBe(429)
			expect(vi.mocked(service)).toHaveBeenCalledTimes(20)
		})

		it('[TM] requests without proxy headers share one bucket', async () => {
			vi.mocked(service).mockResolvedValue({
				ok: false,
				reason: 'INVALID_TOKEN',
			})
			let last: Response | undefined
			for (let index = 0; index < 21; index++) {
				last = await route.POST(
					new Request(`http://localhost${path}`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							token: `t-${index}`,
							password: GOOD_PASSWORD,
						}),
					})
				)
			}
			expect(last?.status).toBe(429)
		})

		it('returns a generic 500 without the token when the service throws', async () => {
			vi.mocked(service).mockRejectedValueOnce(new Error('db down'))
			const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
			const response = await route.POST(
				post(path, { token: RAW_TOKEN, password: GOOD_PASSWORD })
			)
			expect(response.status).toBe(500)
			expect(await response.text()).not.toContain(RAW_TOKEN)
			expect(JSON.stringify(spy.mock.calls)).not.toContain(RAW_TOKEN)
			spy.mockRestore()
		})
	}
)

describe.each(cases)(
	'GET $path (removed: no token in query strings)',
	({ route }) => {
		it('exposes no GET handler, so the raw token is never accepted as a query parameter', () => {
			expect('GET' in route).toBe(false)
		})
	}
)
