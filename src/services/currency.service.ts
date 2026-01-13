import { prisma } from '@/lib/prisma'
import { Currency } from '@prisma/client'

export const getCurrencies = async (): Promise<Currency[]> => {
	return await prisma.currency.findMany({
		where: {
			active: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}
