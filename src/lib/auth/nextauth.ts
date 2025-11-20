import NextAuth from 'next-auth'
import { authConfig } from './config'

/**
 * Instancia de NextAuth configurada
 *
 * Esta instancia se usa para:
 * - Exportar GET y POST handlers para la ruta API
 * - Exportar auth, signIn, signOut para uso en middleware y otros lugares
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
	...authConfig,
	trustHost: true,
})
