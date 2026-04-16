/**
 * Mapper para transformar Business de Prisma a BusinessEntity
 * Responsabilidad única: conversión de datos de base de datos a dominio
 */

import type {
	BusinessEntity,
	BusinessStatus,
} from '../types/business-entity.types'
import type { PrismaBusinessWithRelations } from '../types/business-prisma.types'

/**
 * Transforma un Business de Prisma a BusinessEntity
 *
 * @param prisma - Business con relaciones de Prisma
 * @returns BusinessEntity para uso en la UI
 *
 * @example
 * ```typescript
 * const prismaBusiness = await prisma.business.findUnique({
 *   where: { idBusiness: 1 },
 *   include: businessWithRelations,
 * })
 * const entity = prismaBusinessToEntity(prismaBusiness)
 * ```
 */
export function prismaBusinessToEntity(
	prisma: PrismaBusinessWithRelations
): BusinessEntity {
	return {
		id: prisma.idBusiness,
		contract: prisma.contract,
		term: prisma.term,
		value: Number(prisma.value), // Decimal → number
		status: prisma.status as BusinessStatus,
		createdAt: prisma.createdAt.toISOString(), // Date → string

		client: {
			id: prisma.client.idClient,
			fullName: buildFullName(prisma.client.name, prisma.client.lastName),
			identityNumber: prisma.client.identityNumber,
			email: prisma.client.email,
			phone: prisma.client.phone,
		},

		agent: {
			id: prisma.user.idUser,
			fullName: buildFullName(prisma.user.name, prisma.user.lastName),
			roleName: prisma.user.role?.name ?? null,
			email: prisma.user.email,
			phone: prisma.user.phone,
		},

		// Aplanar relación anidada: productPercentageCommission.productConfiguration.product
		product: {
			id: prisma.productPercentageCommission.productConfiguration.product
				.idProduct,
			name: prisma.productPercentageCommission.productConfiguration.product
				.name,
			companyId:
				prisma.productPercentageCommission.productConfiguration.product.company
					.idCompany,
			companyName:
				prisma.productPercentageCommission.productConfiguration.product.company
					.name,
		},

		currency: {
			id: prisma.currency.idCurrency,
			name: prisma.currency.name,
		},

		periodicity: prisma.buyPeriodicity
			? {
					id: prisma.buyPeriodicity.idBuyPeriodicity,
					name: prisma.buyPeriodicity.name,
				}
			: null,

		clientOrigin: {
			id: prisma.clientOrigin.idClientOrigin,
			name: prisma.clientOrigin.name,
		},
	}
}

/**
 * Construye el nombre completo a partir de nombre y apellidos
 */
function buildFullName(
	name: string,
	lastName: string | null | undefined
): string {
	return [name, lastName].filter(Boolean).join(' ').trim()
}

/**
 * Transforma una lista de Business de Prisma a BusinessEntity[]
 */
export function prismaBusinessListToEntities(
	prismaList: PrismaBusinessWithRelations[]
): BusinessEntity[] {
	return prismaList.map(prismaBusinessToEntity)
}
