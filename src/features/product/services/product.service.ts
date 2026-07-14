import { prisma } from '@/lib/prisma'
import type { Product as PrismaProduct } from '@prisma/client'

/**
 * Server-side function to get active product items.
 * Use this in Server Components and API Routes.
 */
export async function getProducts(): Promise<PrismaProduct[]> {
	return await prisma.product.findMany({
		where: {
			status: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}
