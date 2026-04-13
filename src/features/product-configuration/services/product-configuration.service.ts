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
