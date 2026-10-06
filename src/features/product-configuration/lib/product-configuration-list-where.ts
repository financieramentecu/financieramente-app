import type { Prisma } from '@prisma/client'

export interface ProductConfigurationListQuery {
	readonly search: string | null
	readonly active: string | null
	readonly eligible: boolean
}

/**
 * Builds the configuration list filter.
 * `eligible` keeps only active configurations whose product and company are active.
 */
export function buildProductConfigurationListWhere(
	query: ProductConfigurationListQuery
): Prisma.ProductConfigurationWhereInput {
	const where: Prisma.ProductConfigurationWhereInput = {}

	if (query.search) {
		where.OR = [
			{ code: { contains: query.search, mode: 'insensitive' } },
			{
				product: {
					name: { contains: query.search, mode: 'insensitive' },
				},
			},
			{
				level: {
					name: { contains: query.search, mode: 'insensitive' },
				},
			},
		]
	}

	if (query.eligible) {
		where.active = true
		where.product = {
			status: true,
			company: { status: true },
		}
		return where
	}

	if (query.active === 'active') {
		where.active = true
	} else if (query.active === 'inactive') {
		where.active = false
	}

	return where
}
