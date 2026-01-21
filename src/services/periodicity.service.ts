import { prisma } from '@/lib/prisma'
import { BuyPeriodicity } from '@prisma/client'

export const getPeriodicities = async (): Promise<BuyPeriodicity[]> => {
	return await prisma.buyPeriodicity.findMany({
		where: {
			active: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}
