import { describe, it, expect, afterEach, vi } from 'vitest'
import { authConfigEdge } from '../auth.config'

type AuthorizedArgs = Parameters<
	NonNullable<NonNullable<typeof authConfigEdge.callbacks>['authorized']>
>[0]

async function callAuthorized(input: {
	pathname: string
	method?: string
	role?: string | null
	authenticated?: boolean
	headers?: Record<string, string>
}) {
	const { pathname, method = 'GET', role = null, authenticated = true } = input
	const request = {
		nextUrl: new URL(`http://localhost:3000${pathname}`),
		method,
		headers: new Headers(input.headers),
	}
	const auth = authenticated
		? { user: { id: '1', email: 'u@example.com', role }, expires: 'x' }
		: null
	return await authConfigEdge.callbacks!.authorized!({
		auth,
		request,
	} as unknown as AuthorizedArgs)
}

describe('authConfigEdge session callback (Edge role claim)', () => {
	it('defines a session callback so auth.user.role is available at the Edge', () => {
		expect(authConfigEdge.callbacks?.session).toBeTypeOf('function')
	})

	it('copies role and user id from the token into the session user', async () => {
		const session = await authConfigEdge.callbacks!.session!({
			session: {
				user: { name: 'N', email: 'p@example.com', image: null },
				expires: '2099-01-01',
			},
			token: { role: 'PARTNER', userId: 42 },
		} as never)
		expect(session.user).toMatchObject({ role: 'PARTNER', id: '42' })
	})

	it('leaves role null when the token has no role', async () => {
		const session = await authConfigEdge.callbacks!.session!({
			session: { user: { email: 'p@example.com' }, expires: '2099-01-01' },
			token: {},
		} as never)
		expect(session.user?.role).toBeNull()
	})
})

describe('authConfigEdge authorized - PARTNER gate', () => {
	it('returns a 403 ApiResponse JSON for a non-allowlisted API route', async () => {
		const result = await callAuthorized({
			pathname: '/api/admin/users',
			role: 'PARTNER',
		})
		expect(result).toBeInstanceOf(Response)
		const response = result as Response
		expect(response.status).toBe(403)
		expect(await response.json()).toEqual({
			data: null,
			error: 'Sin permisos',
		})
	})

	it('returns 403 for an allowlisted path with a mismatched method', async () => {
		const result = (await callAuthorized({
			pathname: '/api/negocios/1',
			method: 'DELETE',
			role: 'PARTNER',
		})) as Response
		expect(result.status).toBe(403)
	})

	it('redirects a non-allowlisted dashboard page to /dashboard', async () => {
		const result = (await callAuthorized({
			pathname: '/dashboard/admin/users',
			role: 'PARTNER',
		})) as Response
		expect(result).toBeInstanceOf(Response)
		expect(result.status).toBe(302)
		expect(new URL(result.headers.get('Location')!).pathname).toBe('/dashboard')
	})

	it('allows an allowlisted API route', async () => {
		await expect(
			callAuthorized({ pathname: '/api/negocios', role: 'PARTNER' })
		).resolves.toBe(true)
	})

	it('allows the allowlisted dashboard pages', async () => {
		await expect(
			callAuthorized({ pathname: '/dashboard/negocios/5', role: 'PARTNER' })
		).resolves.toBe(true)
		await expect(
			callAuthorized({ pathname: '/dashboard', role: 'PARTNER' })
		).resolves.toBe(true)
	})

	it('does not loop: redirects /dashboard itself never happens (allowed)', async () => {
		const result = await callAuthorized({
			pathname: '/dashboard',
			role: 'PARTNER',
		})
		expect(result).toBe(true)
	})
})

describe('authConfigEdge authorized - non-partner regression', () => {
	it.each(['ADMIN', 'AGENTE', 'CONSULTOR', 'ANALISTA_SOPORTE'])(
		'%s keeps passing through /api and dashboard routes',
		async (role) => {
			for (const pathname of [
				'/api/admin/users',
				'/api/negocios/1/cancel',
				'/api/production-dashboard/hierarchy-tree',
				'/dashboard/admin/users',
				'/dashboard/calculadora',
			]) {
				await expect(callAuthorized({ pathname, role })).resolves.toBe(true)
			}
		}
	)

	it('redirects a DEFAULT role on the dashboard to access-denied', async () => {
		const result = (await callAuthorized({
			pathname: '/dashboard',
			role: 'DEFAULT',
		})) as Response
		expect(result.status).toBe(302)
		expect(new URL(result.headers.get('Location')!).pathname).toBe(
			'/access-denied'
		)
	})

	it('does not gate DEFAULT on /api (only dashboard pages)', async () => {
		await expect(
			callAuthorized({ pathname: '/api/negocios', role: 'DEFAULT' })
		).resolves.toBe(true)
	})
})

describe('authConfigEdge authorized - unauthenticated /api regression', () => {
	// Public today: health check, API-key and cron-secret service routes, auth
	// endpoints, public account flows, E2E bootstrap and the unauthenticated
	// email endpoint. The widened matcher must not start denying them.
	it.each([
		['/api/health', 'GET'],
		['/api/leads/crm-sync', 'POST'],
		['/api/negocios/cron/fund-payments', 'POST'],
		['/api/auth/session', 'GET'],
		['/api/auth/callback/google', 'GET'],
		['/api/account/activate', 'POST'],
		['/api/account/forgot-password', 'POST'],
		['/api/account/reset-password', 'POST'],
		['/api/test-auth', 'POST'],
		['/api/email/send', 'POST'],
		['/api/negocios', 'GET'],
		['/api/admin/users', 'GET'],
	])(
		'lets unauthenticated %s %s through (route does its own auth)',
		async (pathname, method) => {
			await expect(
				callAuthorized({ pathname, method, authenticated: false })
			).resolves.toBe(true)
		}
	)

	it('keeps rejecting unauthenticated dashboard access as before', async () => {
		await expect(
			callAuthorized({ pathname: '/dashboard', authenticated: false })
		).resolves.toBe(false)
	})

	it('keeps rejecting unauthenticated /api/protected as before', async () => {
		await expect(
			callAuthorized({ pathname: '/api/protected/x', authenticated: false })
		).resolves.toBe(false)
	})

	it('does not gate a logged-in session with a missing role claim', async () => {
		await expect(
			callAuthorized({ pathname: '/api/admin/users', role: null })
		).resolves.toBe(true)
	})
})

describe('authConfigEdge authorized - E2E bypass', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('still returns true for a valid E2E test-auth request, even for PARTNER', async () => {
		vi.stubEnv('NODE_ENV', 'test')
		vi.stubEnv('E2E_TEST_AUTH_TOKEN', 'secret-token')
		await expect(
			callAuthorized({
				pathname: '/api/admin/users',
				role: 'PARTNER',
				headers: {
					'x-test-auth': 'true',
					'x-test-auth-token': 'secret-token',
				},
			})
		).resolves.toBe(true)
	})

	it('does not bypass the gate with a wrong token', async () => {
		vi.stubEnv('NODE_ENV', 'test')
		vi.stubEnv('E2E_TEST_AUTH_TOKEN', 'secret-token')
		const result = (await callAuthorized({
			pathname: '/api/admin/users',
			role: 'PARTNER',
			headers: { 'x-test-auth': 'true', 'x-test-auth-token': 'wrong' },
		})) as Response
		expect(result.status).toBe(403)
	})
})
