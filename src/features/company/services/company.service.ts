import { prisma } from '@/lib/prisma'
import type { Company as PrismaCompany } from '@prisma/client'

/**
 * Server-side function to get active company items.
 * Use this in Server Components and API Routes.
 */
export async function getCompanies(): Promise<PrismaCompany[]> {
	return await prisma.company.findMany({
		where: {
			status: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}
