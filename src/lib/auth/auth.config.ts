import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { resolveAuthSecret } from '@/lib/auth/auth-secret'
import { isE2ETestAuthAllowed } from '@/lib/auth/test-auth'

/**
 * Configuración base de NextAuth - Edge Compatible
 *
 * IMPORTANTE: Esta configuración NO debe importar nada que use Prisma
 * porque se usa en el middleware que corre en Edge Runtime.
 *
 * Los callbacks que necesitan acceso a la base de datos están en config.ts
 */
export const authConfigEdge: NextAuthConfig = {
	// Secret resolver: in production/qa/staging a missing AUTH_SECRET throws so
	// misconfigured deployments fail fast instead of silently using a public
	// hardcoded fallback. In dev/test, a random per-process value is used.
	secret: resolveAuthSecret(),
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
			// Permitir acceso en modo prueba (E2E) sólo cuando:
			//  - NODE_ENV === 'test', y
			//  - el caller envía x-test-auth: true, y
			//  - x-test-auth-token coincide con E2E_TEST_AUTH_TOKEN configurado.
			if (isE2ETestAuthAllowed((name) => request.headers.get(name))) {
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
