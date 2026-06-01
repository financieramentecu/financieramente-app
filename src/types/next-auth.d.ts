import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT as DefaultJWT } from 'next-auth/jwt'
import { UserRole } from '@/features/auth/lib/roles'
import { RolePermissions } from '@/features/auth/lib/permissions'

declare module 'next-auth' {
	interface Session {
		user: {
			id: string
			role: UserRole | null
			permissions: RolePermissions | null
			originalUserId?: number | null
			originalRole?: UserRole | null
			originalEmail?: string | null
			originalName?: string | null
		} & DefaultSession['user']
	}

	interface User extends DefaultUser {
		role?: UserRole
		permissions?: RolePermissions | null
		originalUserId?: number | null
		originalRole?: UserRole | null
		originalEmail?: string | null
		originalName?: string | null
	}
}

declare module 'next-auth/jwt' {
	interface JWT extends DefaultJWT {
		userId?: number
		role?: UserRole | null
		permissions?: RolePermissions | null
		originalUserId?: number | null
		originalRole?: UserRole | null
		originalEmail?: string | null
		originalName?: string | null
	}
}
