import NextAuth from 'next-auth'
import {
	NextResponse,
	type NextFetchEvent,
	type NextRequest,
} from 'next/server'
import { authConfigEdge } from '@/lib/auth/auth.config'
import { readSessionToken } from '@/lib/auth/edge-session-token'
import { isPartnerRequestAllowed } from '@/lib/auth/partner-allowlist'
import { isE2ETestAuthAllowed } from '@/lib/auth/test-auth'
import { UserRole } from '@/features/auth/lib/roles'

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
 *   after `update({ impersonateUserId })`). Routes authenticate themselves, so
 *   here only the PARTNER allowlist is enforced and cookies are never touched.
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
})

function takesDecodeOnlyPath(pathname: string): boolean {
	return pathname.startsWith('/api/') && !pathname.startsWith('/api/protected')
}

/** PARTNER allowlist for `/api/*`; never reads or writes cookies on the response. */
async function gateApiRequest(request: NextRequest): Promise<Response> {
	if (isE2ETestAuthAllowed((name) => request.headers.get(name))) {
		return NextResponse.next()
	}

	const token = await readSessionToken(request)
	if (
		token?.role === UserRole.PARTNER &&
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
	// `/api/:path*` is matched so the PARTNER-only gate also covers every API
	// route; other roles and unauthenticated requests pass through unchanged.
	// No body parsing here, so uploads and SSE streams are untouched.
	matcher: ['/dashboard/:path*', '/api/:path*'],
}
