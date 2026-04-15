import { prisma } from '@/lib/prisma'
import { prismaProductConfigToProductConfig } from '@/features/product-configuration/mappers/product-configuration.mapper'
import type { ProductConfiguration } from '@/features/product-configuration/types/product-configuration.types'

const productConfigurationInclude = {
	product: {
		select: {
			idProduct: true,
			name: true,
			company: {
				select: { idCompany: true, name: true },
			},
		},
	},
	clientOrigin: {
		select: { idClientOrigin: true, name: true },
	},
	category: {
		select: { idCategory: true, name: true },
	},
	productPercentageCommissionNewBusinesses: {
		select: {
			idProductPercentageCommission: true,
			description: true,
			active: true,
		},
	},
	productPercentageCommissions: {
		select: {
			idProductPercentageCommission: true,
			description: true,
			active: true,
		},
	},
} as const

/**
 * Returns a product configuration by unique business code, or null if not found.
 */
export async function getProductConfigurationByCode(
	code: string
): Promise<ProductConfiguration | null> {
	const trimmed = code.trim()
	if (!trimmed) {
		return null
	}

	const row = await prisma.productConfiguration.findUnique({
		where: { code: trimmed },
		include: productConfigurationInclude,
	})

	if (!row) {
		return null
	}

	return prismaProductConfigToProductConfig(row)
}

/**
 * Product configuration IDs that have at least one saved
 * `ProductPercentageCommissionCategory` row (distribution setup started).
 */
export async function getProductConfigurationIdsWithCategoryLines(
	ids: readonly number[]
): Promise<Set<number>> {
	if (ids.length === 0) {
		return new Set()
	}

	const rows = await prisma.productPercentageCommissionCategory.findMany({
		where: {
			productPercentageCommission: {
				idProductConfiguration: { in: [...ids] },
			},
		},
		select: {
			productPercentageCommission: {
				select: { idProductConfiguration: true },
			},
		},
	})

	return new Set(
		rows.map((r) => r.productPercentageCommission.idProductConfiguration)
	)
}

/**
 * True when at least one category line exists for any commission rule under this configuration.
 */
export async function isDistributionSetupComplete(
	idProductConfiguration: number
): Promise<boolean> {
	const count = await prisma.productPercentageCommissionCategory.count({
		where: {
			productPercentageCommission: {
				idProductConfiguration,
			},
		},
	})

	return count > 0
}
