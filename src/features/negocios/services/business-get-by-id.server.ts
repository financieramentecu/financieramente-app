import 'server-only'

import { prisma } from '@/lib/prisma'
import { businessWithRelations } from '../types/business-prisma.types'
import {
	type BusinessAccessMode,
	checkBusinessRoleGate,
	resolveBusinessScope,
} from './business-access.service'

/**
 * Loads a business by id for server-side flows (SEC-03).
 * - `read` (detail page, default): global roles any business, AGENTE self plus
 *   subordinates, PARTNER own.
 * - `write` (edit page): read-only roles are refused and AGENTE is limited to
 *   own businesses, mirroring PUT /api/negocios/[id].
 * Unknown roles fail closed. Returns `null` (not found) when access is denied.
 */
export async function getBusinessById(
	id: number,
	currentUser: { idUser: number; role: { code: string } | null },
	mode: BusinessAccessMode = 'read'
) {
	if (checkBusinessRoleGate(currentUser, mode)) return null

	const scope = await resolveBusinessScope(prisma, currentUser, {
		ownOnly: mode === 'write',
	})

	return prisma.business.findFirst({
		where: { idBusiness: id, ...scope },
		include: businessWithRelations,
	})
}
