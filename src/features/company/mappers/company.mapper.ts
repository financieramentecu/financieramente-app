/**
 * Mapper for transforming Company from Prisma to Company type
 * Single responsibility: database data conversion to domain
 */

import type { Company } from '../types/company.types'
import type { Company as PrismaCompany, Currency as PrismaCurrency } from '@prisma/client'

type PrismaCompanyWithCurrency = PrismaCompany & {
	currency?: PrismaCurrency | null
}

/**
 * Transforms a Prisma Company to Company type
 *
 * @param prisma - Company from Prisma
 * @returns Company for use in the UI
 *
 * @example
 * ```typescript
 * const prismaCompany = await prisma.company.findUnique({
 *   where: { idCompany: 1 },
 * })
 * const company = prismaCompanyToCompany(prismaCompany)
 * ```
 */
export function prismaCompanyToCompany(
	prisma: PrismaCompanyWithCurrency
): Company {
	return {
		idCompany: prisma.idCompany,
		name: prisma.name,
		idCurrency: prisma.idCurrency,
		status: prisma.status,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
		currency: prisma.currency
			? {
					idCurrency: prisma.currency.idCurrency,
					name: prisma.currency.name,
					symbol: prisma.currency.symbol,
					active: prisma.currency.active,
					createdAt: prisma.currency.createdAt.toISOString(),
					updatedAt: prisma.currency.updatedAt.toISOString(),
				}
			: undefined,
	}
}

/**
 * Transforms a list of Prisma Companies to Company[]
 */
export function prismaCompanyListToCompanies(
	prismaList: PrismaCompany[]
): Company[] {
	return prismaList.map(prismaCompanyToCompany)
}
