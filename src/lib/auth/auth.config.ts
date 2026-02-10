import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'

/**
 * Configuración base de NextAuth - Edge Compatible
 *
 * IMPORTANTE: Esta configuración NO debe importar nada que use Prisma
 * porque se usa en el middleware que corre en Edge Runtime.
 *
 * Los callbacks que necesitan acceso a la base de datos están en config.ts
 */
export const authConfigEdge: NextAuthConfig = {
	// Requerido por Auth.js. En CI/e2e no hay .env: usar fallback para que no falle MissingSecret
	secret:
		process.env.AUTH_SECRET ||
		process.env.NEXTAUTH_SECRET ||
		'fallback-secret-for-development-only',
	providers: [
		Google({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		}),
		// Credentials provider básico - la validación real está en config.ts
		Credentials({
			name: 'credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			// Este authorize nunca se ejecuta en Edge - solo es para que el provider exista
			authorize: () => null,
		}),
	],
	pages: {
		signIn: '/login',
		error: '/login',
	},
	session: {
		strategy: 'jwt',
	},
	callbacks: {
		// El callback authorized se usa en el middleware para verificar autenticación
		authorized({ auth, request }) {
			const { nextUrl } = request
			// Permitir acceso en modo prueba (E2E) cuando se envía el header x-test-auth
			if (
				process.env.NODE_ENV !== 'production' &&
				request.headers.get('x-test-auth') === 'true'
			) {
				return true
			}
			const isLoggedIn = !!auth?.user
			const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
			const isOnProtectedApi = nextUrl.pathname.startsWith('/api/protected')

			if (isOnDashboard || isOnProtectedApi) {
				if (isLoggedIn) {
					// Verificar rol DEFAULT
					if (auth?.user?.role === 'DEFAULT') {
						return Response.redirect(
							new URL('/access-denied?reason=default_role', nextUrl)
						)
					}
					return true
				}
				return false // Redirige a signIn page
			}

			return true
		},
	},
	trustHost: true,
}
