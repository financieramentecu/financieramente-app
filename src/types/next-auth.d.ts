import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT as DefaultJWT } from 'next-auth/jwt'
import { UserRole } from '@/features/auth/lib/roles'
import type { RoleGrants } from '@/features/access-control/types/access-control.types'

declare module 'next-auth' {
	interface Session {
		user: {
			id: string
			role: UserRole | null
			/** Grants of the effective role (access-control); absent on stale sessions. */
			grants?: RoleGrants
			/** Level codes lowest to highest; filled only when a grant has a minimum level. */
			levelOrder?: string[]
			canViewOthersCrm?: boolean
			originalUserId?: number | null
			originalRole?: UserRole | null
			originalEmail?: string | null
			originalName?: string | null
		} & DefaultSession['user']
	}

	interface User extends DefaultUser {
		role?: UserRole
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
		canViewOthersCrm?: boolean
		originalUserId?: number | null
		originalRole?: UserRole | null
		originalEmail?: string | null
		originalName?: string | null
	}
}
