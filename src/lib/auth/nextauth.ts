import NextAuth from 'next-auth'
import type { Session } from 'next-auth'
import { authConfig } from './config'
import { createRequestMemoizedAuth } from './memoized-auth'

/**
 * Instancia de NextAuth configurada
 *
 * Esta instancia se usa para:
 * - Exportar GET y POST handlers para la ruta API
 * - Exportar auth, signIn, signOut para uso en middleware y otros lugares
 */
const nextAuth = NextAuth({
	...authConfig,
	trustHost: true,
})

export const { handlers, signIn, signOut } = nextAuth

/**
 * Server-side session read, memoized per request with `React.cache` (F5): the
 * root layout, dashboard layout, page and role guards share ONE call. Zero
 * arguments only; the middleware uses its own Edge `NextAuth(authConfigEdge)`
 * instance, so the wrapper forms `auth(handler)` / `auth(req, res)` never go
 * through here.
 */
export const auth = createRequestMemoizedAuth(
	async () => (await nextAuth.auth()) as Session | null
)
