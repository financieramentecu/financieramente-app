/**
 * Mapper for transforming Company from Prisma to Company type
 * Single responsibility: database data conversion to domain
 */

import type { Company } from '../types/company.types'
import type { Company as PrismaCompany } from '@prisma/client'

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
export function prismaCompanyToCompany(prisma: PrismaCompany): Company {
	return {
		idCompany: prisma.idCompany,
		name: prisma.name,
		status: prisma.status,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
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
