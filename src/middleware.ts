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

export default auth

export const config = {
	matcher: ['/dashboard/:path*', '/api/protected/:path*'],
}
