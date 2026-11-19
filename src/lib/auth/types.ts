import { DefaultSession } from 'next-auth'
import { UserRole } from '@/features/auth/lib/roles'
import { RolePermissions } from '@/features/auth/lib/permissions'

/**
 * Tipos extendidos para NextAuth
 * Permite agregar campos personalizados a la sesión
 */
declare module 'next-auth' {
	interface Session {
		user: {
			id?: string
			email: string
			name?: string | null
			image?: string | null
			role?: UserRole | null
			permissions?: RolePermissions | null
		} & DefaultSession['user']
	}

	interface User {
		id?: string
		email: string
		name?: string | null
		image?: string | null
		role?: UserRole | null
	}
}

// NextAuth v5 no requiere declaración de módulo jwt separada
// Los tipos de JWT se manejan internamente
// Si necesitas tipos de JWT, usa la API de NextAuth v5 directamente

// Re-exportar funciones de dominio desde features/auth
export {
	CORPORATE_DOMAIN,
	isValidCorporateEmail,
} from '@/features/auth/types/auth.types'
