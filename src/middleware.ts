import NextAuth from 'next-auth'
import { authConfigEdge } from '@/lib/auth/auth.config'

/**
 * Middleware para proteger rutas usando NextAuth v5
 *
 * IMPORTANTE: Este middleware corre en Edge Runtime.
 * NO puede importar código que use Prisma u otras dependencias de Node.js.
 * Usa authConfigEdge que es Edge-compatible (sin callbacks de DB).
 *
 * La lógica de autorización está en authConfigEdge.callbacks.authorized
 */

const { auth } = NextAuth(authConfigEdge)

export default auth((req) => {
	const isLoggedIn = !!req.auth
	const { nextUrl } = req

	// Log para diagnóstico de problemas de sesión en QA (403 después de 20 min)
	if (
		nextUrl.pathname.startsWith('/api/auth') ||
		nextUrl.pathname.startsWith('/dashboard')
	) {
		console.log(`[Middleware] ${req.method} ${nextUrl.pathname}`, {
			hasAuth: isLoggedIn,
			userId: req.auth?.user?.id,
			cookies: req.cookies.getAll().map((c) => c.name), // Solo nombres para privacidad
		})
	}
})

export const config = {
	matcher: ['/dashboard/:path*', '/api/protected/:path*', '/api/auth/:path*'],
}
