import 'server-only'

import { UserRole } from '@/features/auth/lib/roles'
import { prisma } from '@/lib/prisma'
import { businessWithRelations } from '../types/business-entity.types'

/**
 * Loads a business by id for server-side edit flows.
 * Agents are scoped to their own businesses; other roles resolve by id.
 */
export async function getBusinessById(
	id: number,
	currentUser: { idUser: number; role: { code: string } | null }
) {
	const isAgent = currentUser.role?.code === UserRole.AGENTE
	const whereClause = isAgent
		? { idBusiness: id, idUser: currentUser.idUser }
		: { idBusiness: id }

	return prisma.business.findFirst({
		where: whereClause,
		include: businessWithRelations,
	})
}
