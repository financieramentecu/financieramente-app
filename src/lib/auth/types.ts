import { DefaultSession } from 'next-auth'
import { UserRole } from './roles'
import { RolePermissions } from './permissions'

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

/**
 * Constantes de dominio corporativo
 */
export const CORPORATE_DOMAIN = 'financieramentecu.com'

/**
 * Validación de dominio de email corporativo
 */
export function isValidCorporateEmail(email: string): boolean {
	if (!email || typeof email !== 'string') {
		return false
	}

	const emailDomain = email.split('@')[1]
	return emailDomain === CORPORATE_DOMAIN
}
