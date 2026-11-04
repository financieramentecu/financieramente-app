import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { resolveAuthSecret } from '@/lib/auth/auth-secret'
import { isE2ETestAuthAllowed } from '@/lib/auth/test-auth'
import { isPartnerRequestAllowed } from '@/lib/auth/partner-allowlist'
import { UserRole } from '@/features/auth/lib/roles'

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
		// Edge session: the default session callback only exposes name, email and
		// image, so `auth.user.role` was never available in `authorized`. Copy the
		// role claim (issued by the Node `jwt` callback) from the token. This
		// reads the cookie only; per-request DB revalidation happens in Node.
		session({ session, token }) {
			if (session.user) {
				if (token?.userId) {
					session.user.id = String(token.userId)
				}
				session.user.role =
					typeof token?.role === 'string' ? (token.role as UserRole) : null
			}
			return session
		},
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
			const isOnApi = nextUrl.pathname.startsWith('/api/')

			// PARTNER deny-by-default allowlist (PA-01, SEC-02). Evaluated ONLY for
			// role PARTNER; every other role and unauthenticated request keeps the
			// behavior below, so public/API-key/cron routes are unaffected.
			if (
				isLoggedIn &&
				auth?.user?.role === UserRole.PARTNER &&
				(isOnDashboard || isOnApi) &&
				!isPartnerRequestAllowed(nextUrl.pathname, request.method)
			) {
				if (isOnApi) {
					return Response.json(
						{ data: null, error: 'Sin permisos' },
						{ status: 403 }
					)
				}
				return Response.redirect(new URL('/dashboard', nextUrl))
			}

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
