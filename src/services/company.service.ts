import { prisma } from '@/lib/prisma'
import { Company } from '@prisma/client'

export const getCompanies = async (): Promise<Company[]> => {
	return await prisma.company.findMany({
		where: {
			status: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}
