import type { PrismaClient } from '@prisma/client'
import type { DataScopeCode } from '../types/access-control.types'
import { getSubordinateUserIds } from './team-hierarchy.service'

export interface ScopeOptions {
	/**
	 * Narrow TEAM to the user alone (no subordinates). For rules that are
	 * owner-only, e.g. PUT /api/negocios/[id].
	 */
	ownOnly?: boolean
}

/**
 * The single data-visibility rule. Returns the owner user ids the user may
 * see, or `undefined` when unrestricted:
 * - COMPANY            -> undefined (no owner filter)
 * - TEAM               -> [self, ...subordinates] ([self] with `ownOnly`)
 * - OWN                -> [self]
 * - no scope (denied)  -> [] (matches nothing: fails closed)
 */
export async function resolveOwnerScope(
	prisma: Pick<PrismaClient, 'user'>,
	user: { idUser: number },
	scope: DataScopeCode | undefined,
	options: ScopeOptions = {}
): Promise<number[] | undefined> {
	switch (scope) {
		case 'COMPANY':
			return undefined
		case 'OWN':
			return [user.idUser]
		case 'TEAM': {
			if (options.ownOnly) return [user.idUser]
			const subordinates = await getSubordinateUserIds(prisma, user.idUser)
			return [user.idUser, ...subordinates]
		}
		default:
			return []
	}
}
