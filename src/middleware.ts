import NextAuth from 'next-auth'
import {
	NextResponse,
	type NextFetchEvent,
	type NextRequest,
} from 'next/server'
import { authConfigEdge } from '@/lib/auth/auth.config'
import { readSessionToken } from '@/lib/auth/edge-session-token'
import { isPartnerRequestAllowed } from '@/lib/auth/partner-allowlist'
import { isPublicApiRequest } from '@/lib/auth/public-api-allowlist'
import { isE2ETestAuthAllowed } from '@/lib/auth/test-auth'
import { UserRole } from '@/features/auth/lib/roles'
import { buildNegociosSeedRedirectPath } from '@/features/negocios/lib/default-date-filter'

/**
 * Middleware para proteger rutas usando NextAuth v5
 *
 * IMPORTANTE: Este middleware corre en Edge Runtime.
 * NO puede importar código que use Prisma u otras dependencias de Node.js.
 * Usa authConfigEdge que es Edge-compatible (sin callbacks de DB).
 *
 * Two paths:
 * - `/dashboard/*` (and `/api/protected*`): the `auth(handler)` wrapper, whose
 *   `authorized` callback keeps the login redirect, the DEFAULT role redirect
 *   and the PARTNER page allowlist.
 * - every other `/api/*`: decode-only. The wrapper decrypts AND re-encrypts the
 *   session JWT and appends `Set-Cookie` to every response, which costs CPU on
 *   uploads/SSE and lets a late response overwrite a newer cookie (for example
 *   after `update({ impersonateUserId })`). Cookies are never touched here.
 *   The gate is FAIL-CLOSED (COM-53): a request without a valid session gets 401
 *   unless it targets a public route (`public-api-allowlist.ts`); PARTNER
 *   sessions are further limited to their allowlist. Routes still authorize
 *   their own role/ownership.
 *   `/api/auth/*` is included on purpose: NextAuth's own Node route handler
 *   owns sign-in, `/api/auth/session` refresh and `update()` cookies.
 */

const { auth } = NextAuth(authConfigEdge)

const dashboardMiddleware = auth((req) => {
	const isLoggedIn = !!req.auth
	const { nextUrl } = req

	// Log para diagnóstico de problemas de sesión en QA (403 después de 20 min)
	if (nextUrl.pathname.startsWith('/dashboard')) {
		console.log(`[Middleware] ${req.method} ${nextUrl.pathname}`, {
			hasAuth: isLoggedIn,
			userId: req.auth?.user?.id,
			cookies: req.cookies.getAll().map((c) => c.name), // Solo nombres para privacidad
		})
	}

	// Seed the negocios default date filter here, before the page renders, so
	// a client-side navigation follows the redirect without a blank screen.
	if (isLoggedIn) {
		const seedPath = buildNegociosSeedRedirectPath(
			nextUrl.pathname,
			req.method,
			req.auth?.user?.role ?? undefined,
			nextUrl.searchParams
		)
		if (seedPath) {
			return NextResponse.redirect(new URL(seedPath, nextUrl))
		}
	}
})

function takesDecodeOnlyPath(pathname: string): boolean {
	return pathname.startsWith('/api/') && !pathname.startsWith('/api/protected')
}

/** Fail-closed session gate plus PARTNER allowlist for `/api/*`; never touches cookies. */
async function gateApiRequest(request: NextRequest): Promise<Response> {
	if (isE2ETestAuthAllowed((name) => request.headers.get(name))) {
		return NextResponse.next()
	}

	if (isPublicApiRequest(request.nextUrl.pathname, request.method)) {
		return NextResponse.next()
	}

	const token = await readSessionToken(request)
	if (!token) {
		return Response.json({ data: null, error: 'No autorizado' }, { status: 401 })
	}

	if (
		token.role === UserRole.PARTNER &&
		!isPartnerRequestAllowed(request.nextUrl.pathname, request.method)
	) {
		return Response.json({ data: null, error: 'Sin permisos' }, { status: 403 })
	}

	return NextResponse.next()
}

export default function middleware(
	request: NextRequest,
	event: NextFetchEvent
) {
	if (takesDecodeOnlyPath(request.nextUrl.pathname)) {
		return gateApiRequest(request)
	}
	// `auth(handler)` is typed as a union of middleware and route-handler forms;
	// Next always invokes it with (request, event) here.
	return dashboardMiddleware(request, event as never)
}

export const config = {
	// `/api/:path*` is matched so the session gate (401 without a valid session,
	// except public routes) and the PARTNER allowlist cover every API route.
	// No body parsing here, so uploads and SSE streams are untouched.
	matcher: ['/dashboard/:path*', '/api/:path*'],
}
