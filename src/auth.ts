import { auth as nextAuth } from '@/lib/auth/nextauth'
import { headers } from 'next/headers'
import { isE2ETestAuthAllowed } from '@/lib/auth/test-auth'

/**
 * Wrapper de auth para permitir bypass en tests E2E.
 *
 * El bypass sólo se activa cuando `NODE_ENV === 'test'` y el request lleva
 * tanto `x-test-auth: true` como un `x-test-auth-token` que coincide con
 * `E2E_TEST_AUTH_TOKEN` configurado server-side. Ver `lib/auth/test-auth.ts`.
 */
export const auth = async () => {
	if (process.env.NODE_ENV === 'test') {
		try {
			const headersList = await headers()
			if (isE2ETestAuthAllowed((name) => headersList.get(name))) {
				console.log('[Auth Wrapper] 🔓 Bypassing auth for E2E test')
				const email =
					headersList.get('x-test-user-email') ??
					'test@financieramentecu.com'
				return {
					user: {
						name: 'Test User',
						email,
						image: 'https://via.placeholder.com/150',
						id: 'test-user-id',
						role: 'AGENTE',
					},
					expires: new Date(
						Date.now() + 30 * 24 * 60 * 60 * 1000
					).toISOString(),
				}
			}
		} catch {
			// headers() no disponible o error al leerlos
		}
	}
	return nextAuth()
}
