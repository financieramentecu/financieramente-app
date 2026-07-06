import { prisma } from '@/lib/prisma'
import type { BuyPeriodicity } from '@prisma/client'

/**
 * Server-side function to get active periodicity items.
 * Use this in Server Components and API Routes.
 */
export async function getPeriodicities(): Promise<BuyPeriodicity[]> {
	return await prisma.buyPeriodicity.findMany({
		where: {
			active: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}
