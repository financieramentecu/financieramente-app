// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

vi.hoisted(() => {
	process.env.AUTH_SECRET = 'test-secret-for-middleware-api-gate-0123456789'
	process.env.AUTH_URL = 'http://localhost:3000'
})

// The global setup replaces next/server with a stub; this suite needs the real one.
vi.mock('next/server', async (importOriginal) => await importOriginal())

import { NextRequest, type NextFetchEvent } from 'next/server'
import { encode } from 'next-auth/jwt'
import middleware from '@/middleware'

const SECRET = process.env.AUTH_SECRET as string
const PLAIN_COOKIE = 'authjs.session-token'
const SECURE_COOKIE = '__Secure-authjs.session-token'
const EVENT = { waitUntil: () => undefined } as unknown as NextFetchEvent

async function sessionCookie(
	claims: Record<string, unknown>,
	options: { name?: string; maxAge?: number } = {}
): Promise<string> {
	const name = options.name ?? PLAIN_COOKIE
	const token = await encode({
		token: { userId: 1, email: 'u@example.com', ...claims },
		secret: SECRET,
		salt: name,
		maxAge: options.maxAge ?? 3600,
	})
	return `${name}=${token}`
}

function request(
	path: string,
	init: {
		method?: string
		cookie?: string
		headers?: Record<string, string>
	} = {}
): NextRequest {
	const headers = new Headers(init.headers)
	if (init.cookie) headers.set('cookie', init.cookie)
	return new NextRequest(`http://localhost:3000${path}`, {
		method: init.method ?? 'GET',
		headers,
	})
}

async function run(req: NextRequest): Promise<Response> {
	return (await middleware(req, EVENT)) as Response
}

function expectUntouched(response: Response) {
	expect(response.status).toBe(200)
	expect(response.headers.get('set-cookie')).toBeNull()
	// NextResponse.next() marks a pass-through
	expect(response.headers.get('x-middleware-next')).toBe('1')
}

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('middleware /api/* decode-only gate [TM] (F1)', () => {
	describe('PARTNER', () => {
		let partner: string
		beforeAll(async () => {
			partner = await sessionCookie({ role: 'PARTNER' })
		})

		it('allows an allowlisted API route and does not touch cookies', async () => {
			expectUntouched(
				await run(request('/api/negocios/stats', { cookie: partner }))
			)
		})

		it('allows an allowlisted API route under the secure cookie name as well', async () => {
			const secure = await sessionCookie(
				{ role: 'PARTNER' },
				{ name: SECURE_COOKIE }
			)
			expectUntouched(
				await run(
					request('/api/negocios/stats', {
						cookie: secure,
						headers: { 'x-forwarded-proto': 'https' },
					})
				)
			)
		})

		it.each([
			['/api/admin/users', 'GET'],
			['/api/pre-liquidacion/archivos', 'GET'],
			['/api/negocios', 'DELETE'],
			['/api/negocios/1/cancel', 'POST'],
			['/api/future-endpoint', 'GET'],
		])('denies %s %s with 403 JSON and no Set-Cookie', async (path, method) => {
			const response = await run(request(path, { method, cookie: partner }))
			expect(response.status).toBe(403)
			expect(await response.json()).toEqual({
				data: null,
				error: 'Sin permisos',
			})
			expect(response.headers.get('set-cookie')).toBeNull()
		})

		it('denial also works with the secure cookie name', async () => {
			const secure = await sessionCookie(
				{ role: 'PARTNER' },
				{ name: SECURE_COOKIE }
			)
			const response = await run(
				request('/api/admin/users', { cookie: secure })
			)
			expect(response.status).toBe(403)
		})

		it('denies a PARTNER whose JWT is split into chunked cookies', async () => {
			const token = await encode({
				token: { userId: 1, role: 'PARTNER' },
				secret: SECRET,
				salt: PLAIN_COOKIE,
				maxAge: 3600,
			})
			const mid = Math.floor(token.length / 2)
			const cookie = `${PLAIN_COOKIE}.0=${token.slice(0, mid)}; ${PLAIN_COOKIE}.1=${token.slice(mid)}`
			const response = await run(request('/api/admin/users', { cookie }))
			expect(response.status).toBe(403)
		})

		it('still reaches the NextAuth routes (session, csrf, callback) untouched', async () => {
			expectUntouched(
				await run(request('/api/auth/session', { cookie: partner }))
			)
			expectUntouched(
				await run(
					request('/api/auth/session', { method: 'POST', cookie: partner })
				)
			)
			expectUntouched(await run(request('/api/auth/csrf', { cookie: partner })))
		})
	})

	describe('non-partner and unauthenticated requests pass through untouched', () => {
		it.each(['ADMIN', 'AGENTE', 'CONSULTOR', 'DEFAULT'])(
			'role %s on a non-allowlisted route',
			async (role) => {
				const cookie = await sessionCookie({ role })
				expectUntouched(await run(request('/api/admin/users', { cookie })))
			}
		)

		it.each([
			['/api/health', 'GET'],
			['/api/leads/crm-sync', 'POST'],
			['/api/account/forgot-password', 'POST'],
			['/api/notifications/stream', 'GET'],
			['/api/carga-archivos/file-import', 'POST'],
			['/api/cron/anything', 'GET'],
			['/api/auth/callback/credentials', 'POST'],
			['/api/auth/session', 'GET'],
		])('unauthenticated %s %s', async (path, method) => {
			expectUntouched(await run(request(path, { method })))
		})

		it('x-api-key service calls pass through', async () => {
			expectUntouched(
				await run(
					request('/api/leads/crm-sync', {
						method: 'POST',
						headers: { 'x-api-key': 'service-key' },
					})
				)
			)
		})

		it('treats a malformed session cookie as unauthenticated', async () => {
			expectUntouched(
				await run(
					request('/api/admin/users', { cookie: `${PLAIN_COOKIE}=not-a-jwt` })
				)
			)
		})

		it('treats an expired token as unauthenticated (routes do their own auth)', async () => {
			const expired = await sessionCookie({ role: 'PARTNER' }, { maxAge: -60 })
			expectUntouched(
				await run(request('/api/admin/users', { cookie: expired }))
			)
		})

		it('treats a token signed with another secret as unauthenticated', async () => {
			const forged = await encode({
				token: { userId: 1, role: 'PARTNER' },
				secret: 'another-secret-another-secret-another-secret',
				salt: PLAIN_COOKIE,
				maxAge: 3600,
			})
			expectUntouched(
				await run(
					request('/api/admin/users', { cookie: `${PLAIN_COOKIE}=${forged}` })
				)
			)
		})

		it('does not accept a token whose salt does not match the cookie name', async () => {
			const wrongSalt = await encode({
				token: { userId: 1, role: 'PARTNER' },
				secret: SECRET,
				salt: 'something-else',
				maxAge: 3600,
			})
			expectUntouched(
				await run(
					request('/api/admin/users', {
						cookie: `${PLAIN_COOKIE}=${wrongSalt}`,
					})
				)
			)
		})
	})

	describe('E2E test-auth bypass', () => {
		it('lets a PARTNER cookie through when the bypass headers are valid', async () => {
			vi.stubEnv('NODE_ENV', 'test')
			vi.stubEnv('E2E_TEST_AUTH_TOKEN', 'e2e-secret')
			const cookie = await sessionCookie({ role: 'PARTNER' })
			expectUntouched(
				await run(
					request('/api/admin/users', {
						cookie,
						headers: {
							'x-test-auth': 'true',
							'x-test-auth-token': 'e2e-secret',
						},
					})
				)
			)
		})

		it('ignores the bypass headers with a wrong token', async () => {
			vi.stubEnv('NODE_ENV', 'test')
			vi.stubEnv('E2E_TEST_AUTH_TOKEN', 'e2e-secret')
			const cookie = await sessionCookie({ role: 'PARTNER' })
			const response = await run(
				request('/api/admin/users', {
					cookie,
					headers: { 'x-test-auth': 'true', 'x-test-auth-token': 'nope' },
				})
			)
			expect(response.status).toBe(403)
		})
	})
})

describe('middleware /dashboard/* keeps the auth() wrapper behavior', () => {
	it('passes an unauthenticated request through (the dashboard layout redirects to /login server-side)', async () => {
		const response = await run(request('/dashboard/negocios'))
		expect(response.status).toBe(200)
		expect(response.headers.get('location')).toBeNull()
	})

	it('lets an authenticated non-partner through', async () => {
		const cookie = await sessionCookie({ role: 'ADMIN' })
		const response = await run(request('/dashboard/admin', { cookie }))
		expect(response.status).toBe(200)
		expect(response.headers.get('location')).toBeNull()
	})

	it('redirects a PARTNER away from a non-allowlisted dashboard page', async () => {
		const cookie = await sessionCookie({ role: 'PARTNER' })
		const response = await run(request('/dashboard/admin', { cookie }))
		expect(response.status).toBe(302)
		expect(new URL(response.headers.get('location') as string).pathname).toBe(
			'/dashboard'
		)
	})

	it('lets a PARTNER open the allowlisted negocios page', async () => {
		const cookie = await sessionCookie({ role: 'PARTNER' })
		const response = await run(request('/dashboard/negocios', { cookie }))
		expect(response.status).toBe(200)
		expect(response.headers.get('location')).toBeNull()
	})

	it('redirects the DEFAULT role to access-denied', async () => {
		const cookie = await sessionCookie({ role: 'DEFAULT' })
		const response = await run(request('/dashboard', { cookie }))
		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toContain('/access-denied')
	})
})
