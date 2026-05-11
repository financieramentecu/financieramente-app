import { Decimal } from '@prisma/client/runtime/library'
import {
	CommissionRule,
	CommissionRuleCategory,
} from '../types/commission-rule.types'

/**
 * Prisma result types with includes.
 * Note: Prisma returns Decimal types which need conversion or are typed as such.
 */
type DecimalLike = {
	toNumber(): number
} | number | string

type PrismaCommissionRuleCategory = {
	id: number
	idLevel: number
	idProductPercentageCommission: number
	porcentajeDistribucion: DecimalLike
	porcentajePortfolio?: DecimalLike | null
	active: boolean
	createdAt: Date
	updatedAt: Date
	level?: {
		idLevel: number
		name: string
	}
	// Legacy alias — old DB column, kept for backward compat during migration
	idCategory?: number
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
	hasPortfolio?: boolean
	createdAt: Date
	updatedAt: Date
	productPercentageCommissionCategories?: PrismaCommissionRuleCategory[]
}

function fractionToPercent0to100(value: DecimalLike): number {
	const asString =
		typeof value === 'object' &&
		value !== null &&
		'toString' in value
			? (value as { toString(): string }).toString()
			: String(value)
	return new Decimal(asString).times(100).toNumber()
}

/**
 * Transforms a Prisma CommissionRuleCategory to domain type
 */
export function prismaCommissionRuleCategoryToDomain(
	prisma: PrismaCommissionRuleCategory
): CommissionRuleCategory {
	const porcentajePortfolio =
		prisma.porcentajePortfolio != null
			? fractionToPercent0to100(prisma.porcentajePortfolio)
			: undefined

	// Support both old (category) and new (level) shape
	const levelId = prisma.idLevel ?? prisma.idCategory ?? 0
	const levelInfo = prisma.level ?? (prisma.category ? { idLevel: prisma.category.idCategory, name: prisma.category.name } : undefined)

	return {
		id: prisma.id,
		idLevel: levelId,
		idProductPercentageCommission: prisma.idProductPercentageCommission,
		porcentajeDistribucion: fractionToPercent0to100(prisma.porcentajeDistribucion),
		...(porcentajePortfolio !== undefined
			? { porcentajePortfolio }
			: {}),
		active: prisma.active,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
		category: levelInfo
			? {
					idLevel: levelInfo.idLevel,
					name: levelInfo.name,
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
		hasPortfolio: prisma.hasPortfolio ?? false,
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
