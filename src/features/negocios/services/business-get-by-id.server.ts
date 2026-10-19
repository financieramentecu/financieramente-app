import 'server-only'

import { isWriteBypassRole } from '@/features/auth/lib/roles'
import { prisma } from '@/lib/prisma'
import { businessWithRelations } from '../types/business-prisma.types'

/**
 * Loads a business by id for server-side edit flows.
 * Only write-bypass roles (ADMIN/ASISTENTE_GERENCIA_OPERATIVA/ANALISTA_SOPORTE)
 * resolve by id alone; every other role (AGENTE, CONSULTOR, or a future role
 * not yet classified) is scoped to its own businesses by default — matching
 * the ownership check in api/negocios/[id]/route.ts PUT.
 */
export async function getBusinessById(
	id: number,
	currentUser: { idUser: number; role: { code: string } | null }
) {
	const isScoped = !isWriteBypassRole(currentUser.role?.code)
	const whereClause = isScoped
		? { idBusiness: id, idUser: currentUser.idUser }
		: { idBusiness: id }

	return prisma.business.findFirst({
		where: whereClause,
		include: businessWithRelations,
	})
}
