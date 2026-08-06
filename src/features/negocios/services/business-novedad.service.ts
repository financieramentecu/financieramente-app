/**
 * Prisma access layer for manual novedad status management.
 * All Prisma calls for PATCH /api/negocios/[id]/manage-novedad live here —
 * the route stays HTTP-only (SOLID: Dependency Inversion, Single Responsibility).
 */

import { prisma } from '@/lib/prisma'
import { businessWithRelations } from '@/features/negocios/types/business-prisma.types'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import type {
	BusinessEntity,
	BusinessNovedadStatus,
} from '@/features/negocios/types/business-entity.types'
import type { PrismaBusinessWithRelations } from '@/features/negocios/types/business-prisma.types'

export interface NovedadContext {
	business: PrismaBusinessWithRelations
	novedadStatus: BusinessNovedadStatus | null
}

/**
 * Loads a business plus its current novedad status.
 * Returns `null` when the business does not exist.
 */
export async function getNovedadContext(
	businessId: number
): Promise<NovedadContext | null> {
	const business = await prisma.business.findUnique({
		where: { idBusiness: businessId },
		include: businessWithRelations,
	})

	if (!business) {
		return null
	}

	return {
		business,
		novedadStatus: business.novedadStatus as BusinessNovedadStatus | null,
	}
}

/**
 * Sets the novedad status to one of the four manual states.
 * Returns the mapped domain entity — no `ApiResponse` shape here.
 */
export async function updateNovedadStatus(
	businessId: number,
	target: BusinessNovedadStatus
): Promise<BusinessEntity> {
	const updated = await prisma.business.update({
		where: { idBusiness: businessId },
		data: { novedadStatus: target },
		include: businessWithRelations,
	})

	return prismaBusinessToEntity(updated)
}
