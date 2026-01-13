import { describe, it, expect } from 'vitest'
import {
	prismaProductToProduct,
	prismaProductListToProducts,
} from '../../mappers/product.mapper'
import { createMockPrismaProduct } from '../fixtures/mock-product'

describe('product.mapper', () => {
	describe('prismaProductToProduct', () => {
		it('should transform Prisma product to Product (happy path)', () => {
			const prismaProduct = createMockPrismaProduct({
				idProduct: 1,
				name: 'Seguro de Vida',
				description: 'Seguro completo',
				status: true,
			})

			const result = prismaProductToProduct(prismaProduct)

			expect(result.idProduct).toBe(1)
			expect(result.idCompany).toBe(1)
			expect(result.name).toBe('Seguro de Vida')
			expect(result.description).toBe('Seguro completo')
			expect(result.status).toBe(true)
		})

		it('should convert Date to ISO string', () => {
			const prismaProduct = createMockPrismaProduct({
				createdAt: new Date('2024-01-15T10:00:00.000Z'),
				updatedAt: new Date('2024-01-15T11:00:00.000Z'),
			})

			const result = prismaProductToProduct(prismaProduct)

			expect(typeof result.createdAt).toBe('string')
			expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z')
			expect(typeof result.updatedAt).toBe('string')
			expect(result.updatedAt).toBe('2024-01-15T11:00:00.000Z')
		})

		it('should map company information correctly', () => {
			const prismaProduct = createMockPrismaProduct({
				company: {
					idCompany: 2,
					name: 'Sura',
					idTypeCompany: 'NACIONAL',
					status: true,
					createdAt: new Date('2024-01-01T00:00:00.000Z'),
					updatedAt: new Date('2024-01-01T00:00:00.000Z'),
				},
			})

			const result = prismaProductToProduct(prismaProduct)

			expect(result.company.idCompany).toBe(2)
			expect(result.company.name).toBe('Sura')
		})

		it('should handle null description', () => {
			const prismaProduct = createMockPrismaProduct({
				description: null,
			})

			const result = prismaProductToProduct(prismaProduct)

			expect(result.description).toBeNull()
		})

		it('should handle status as false', () => {
			const prismaProduct = createMockPrismaProduct({
				status: false,
			})

			const result = prismaProductToProduct(prismaProduct)

			expect(result.status).toBe(false)
		})
	})

	describe('prismaProductListToProducts', () => {
		it('should transform list of Prisma products to Products array (happy path)', () => {
			const prismaProducts = [
				createMockPrismaProduct({
					idProduct: 1,
					name: 'Seguro de Vida',
				}),
				createMockPrismaProduct({
					idProduct: 2,
					name: 'Seguro de Salud',
				}),
			]

			const result = prismaProductListToProducts(prismaProducts)

			expect(result).toHaveLength(2)
			expect(result[0].idProduct).toBe(1)
			expect(result[0].name).toBe('Seguro de Vida')
			expect(result[1].idProduct).toBe(2)
			expect(result[1].name).toBe('Seguro de Salud')
		})

		it('should handle empty array', () => {
			const prismaProducts: ReturnType<typeof createMockPrismaProduct>[] = []

			const result = prismaProductListToProducts(prismaProducts)

			expect(result).toHaveLength(0)
			expect(result).toEqual([])
		})

		it('should transform single product in array', () => {
			const prismaProducts = [
				createMockPrismaProduct({
					idProduct: 1,
					name: 'Seguro de Vida',
				}),
			]

			const result = prismaProductListToProducts(prismaProducts)

			expect(result).toHaveLength(1)
			expect(result[0].idProduct).toBe(1)
			expect(result[0].name).toBe('Seguro de Vida')
		})

		it('should preserve all product properties in list', () => {
			const prismaProducts = [
				createMockPrismaProduct({
					idProduct: 1,
					name: 'Seguro de Vida',
					description: 'Descripción 1',
					status: true,
				}),
				createMockPrismaProduct({
					idProduct: 2,
					name: 'Seguro de Salud',
					description: null,
					status: false,
				}),
			]

			const result = prismaProductListToProducts(prismaProducts)

			expect(result[0].description).toBe('Descripción 1')
			expect(result[0].status).toBe(true)
			expect(result[1].description).toBeNull()
			expect(result[1].status).toBe(false)
		})
	})
})
