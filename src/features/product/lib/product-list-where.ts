import type { Prisma } from '@prisma/client'

/** Page size for configuration selectors so active catalogs are not truncated. */
export const AUTHORIZED_SELECTOR_PAGE_SIZE = 1000

export interface ProductListQuery {
	readonly search: string | null
	readonly status: string | null
	readonly idCompany: string | null
	readonly eligible: boolean
}

/**
 * Builds the product list filter.
 * `eligible` is the authorized selector scope: active product and active company.
 */
export function buildProductListWhere(
	query: ProductListQuery
): Prisma.ProductWhereInput {
	const where: Prisma.ProductWhereInput = {}

	if (query.search) {
		where.OR = [
			{ name: { contains: query.search, mode: 'insensitive' } },
			{
				company: { name: { contains: query.search, mode: 'insensitive' } },
			},
		]
	}

	if (query.eligible) {
		where.status = true
		where.company = { status: true }
	} else if (query.status === 'active') {
		where.status = true
	} else if (query.status === 'inactive') {
		where.status = false
	}

	if (query.idCompany) {
		const companyId = parseInt(query.idCompany, 10)
		if (!Number.isNaN(companyId)) {
			where.idCompany = companyId
		}
	}

	return where
}
