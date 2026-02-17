import { DecimalLike } from '@/features/shared/types/prisma.types'
import {
	CommissionRule,
	CommissionRuleCategory,
} from '../types/commission-rule.types'

/**
 * Prisma result types with includes.
 * Note: Prisma returns Decimal types which need conversion or are typed as such.
 */

type PrismaCommissionRuleCategory = {
	id: number
	idCategory: number
	idProductPercentageCommission: number
	porcentajeDistribucion: DecimalLike // Prisma Decimal
	active: boolean
	createdAt: Date
	updatedAt: Date
	category?: {
		idCategory: number
		name: string
	}
}

type PrismaCommissionRule = {
	idProductPercentageCommission: number
	idProductConfiguration: number
	description: string | null
	active: boolean
	createdAt: Date
	updatedAt: Date
	productPercentageCommissionCategories?: PrismaCommissionRuleCategory[]
}

/**
 * Transforms a Prisma CommissionRuleCategory to domain type
 */
export function prismaCommissionRuleCategoryToDomain(
	prisma: PrismaCommissionRuleCategory
): CommissionRuleCategory {
	const rawPercentage =
		typeof prisma.porcentajeDistribucion === 'object' &&
			'toNumber' in prisma.porcentajeDistribucion
			? prisma.porcentajeDistribucion.toNumber()
			: Number(prisma.porcentajeDistribucion)

	return {
		id: prisma.id,
		idCategory: prisma.idCategory,
		idProductPercentageCommission: prisma.idProductPercentageCommission,
		// Handle Decimal -> number conversion safely
		porcentajeDistribucion: Number((rawPercentage * 100).toFixed(2)),
		active: prisma.active,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
		category: prisma.category
			? {
				idCategory: prisma.category.idCategory,
				name: prisma.category.name,
			}
			: undefined,
	}
}

/**
 * Transforms a Prisma ProductPercentageCommission to domain type
 */
export function prismaCommissionRuleToDomain(
	prisma: PrismaCommissionRule
): CommissionRule {
	return {
		id: prisma.idProductPercentageCommission,
		idProductConfiguration: prisma.idProductConfiguration,
		description: prisma.description,
		active: prisma.active,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
		categories: prisma.productPercentageCommissionCategories
			? prisma.productPercentageCommissionCategories.map(
				prismaCommissionRuleCategoryToDomain
			)
			: [],
	}
}

/**
 * Transforms a list of Prisma CommissionRules
 */
export function prismaCommissionRuleListToDomain(
	prismaList: PrismaCommissionRule[]
): CommissionRule[] {
	return prismaList.map(prismaCommissionRuleToDomain)
}
