import type { Session } from 'next-auth'
import type { AccessUser } from '@/features/negocios/services/business-access.service'

/**
 * Builds the `AccessUser` used by the central business-access service from a
 * NextAuth session (`session.user.id` is the numeric `User.idUser` as string).
 * A non-numeric id yields `idUser: 0`, which matches no owner.
 */
export function toAccessUser(session: Session): AccessUser {
	const idUser = Number.parseInt(session.user.id ?? '', 10)
	return {
		idUser: Number.isFinite(idUser) ? idUser : 0,
		role: session.user.role ? { code: session.user.role } : null,
	}
}
