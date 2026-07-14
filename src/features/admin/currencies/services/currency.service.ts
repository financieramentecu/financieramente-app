import { prisma } from '@/lib/prisma'
import type { Currency as PrismaCurrency } from '@prisma/client'

/**
 * Server-side function to get active currency items.
 * Use this in Server Components and API Routes.
 */
export async function getCurrencies(): Promise<PrismaCurrency[]> {
	return await prisma.currency.findMany({
		where: {
			active: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}
