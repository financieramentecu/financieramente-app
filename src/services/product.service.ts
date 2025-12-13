import { prisma } from '@/lib/prisma'
import { Product } from '@prisma/client'

export const getProducts = async (): Promise<Product[]> => {
	return await prisma.product.findMany({
		where: {
			status: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}
