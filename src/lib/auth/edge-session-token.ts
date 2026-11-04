import { getToken, type JWT } from 'next-auth/jwt'
import { resolveAuthSecret } from '@/lib/auth/auth-secret'

/**
 * Decode-only session read for the Edge middleware.
 *
 * `getToken` verifies and decrypts the session JWT but never re-encodes it or
 * emits `Set-Cookie`, unlike the `auth(handler)` wrapper. Edge-safe: no Node
 * or Prisma imports.
 *
 * The cookie name doubles as the JWT salt, so it must be the one Auth.js used
 * to issue the token: `authjs.session-token`, or the `__Secure-` variant when
 * the request was served over HTTPS (the app overrides only the CSRF cookie;
 * the session cookie keeps the Auth.js defaults). Large JWTs are split into
 * `<name>.0`, `<name>.1`, ... chunks, which `getToken` reassembles.
 */
const SESSION_COOKIE = 'authjs.session-token'
const SECURE_SESSION_COOKIE = `__Secure-${SESSION_COOKIE}`

const secret = resolveAuthSecret()

function usesCookie(names: readonly string[], base: string): boolean {
	return names.some((name) => name === base || name.startsWith(`${base}.`))
}

/** Picks the session cookie name actually present on the request. */
export function resolveSessionCookieName(cookieNames: readonly string[]): {
	cookieName: string
	secureCookie: boolean
} {
	const secureCookie = usesCookie(cookieNames, SECURE_SESSION_COOKIE)
	return {
		cookieName: secureCookie ? SECURE_SESSION_COOKIE : SESSION_COOKIE,
		secureCookie,
	}
}

/**
 * Returns the decoded JWT, or `null` when the cookie is missing, malformed,
 * expired or signed with another secret (treated as unauthenticated).
 */
export async function readSessionToken(request: {
	headers: Headers
	cookies: { getAll: () => { name: string }[] }
}): Promise<JWT | null> {
	const { cookieName, secureCookie } = resolveSessionCookieName(
		request.cookies.getAll().map((cookie) => cookie.name)
	)
	try {
		return await getToken({
			req: request as never,
			secret,
			cookieName,
			secureCookie,
		})
	} catch {
		return null
	}
}
