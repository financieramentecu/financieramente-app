import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import {
	prismaCommissionRuleToDomain,
	prismaCommissionRuleCategoryToDomain,
} from '../../mappers/commission-rule.mapper'

// Mock Decimal class behavior
const mockDecimal = (val: number) => ({
	toNumber: () => val,
	toString: () => val.toString(),
})

describe('Commission Rule Mappers', () => {
	describe('prismaCommissionRuleCategoryToDomain', () => {
		it('should map flat fields correctly', () => {
			const prismaCategory = {
				id: 10,
				idLevel: 100,
				idCategory: 100,
				idProductPercentageCommission: 50,
				porcentajeDistribucion: mockDecimal(0.155),
				active: true,
				createdAt: new Date('2023-01-01T10:00:00Z'),
				updatedAt: new Date('2023-01-02T10:00:00Z'),
			}

			const domain = prismaCommissionRuleCategoryToDomain(prismaCategory)

			expect(domain).toEqual({
				id: 10,
				idLevel: 100,
				idProductPercentageCommission: 50,
				porcentajeDistribucion: 15.5,
				active: true,
				createdAt: '2023-01-01T10:00:00.000Z',
				updatedAt: '2023-01-02T10:00:00.000Z',
				category: undefined,
			})
		})

		it('should preserve precision beyond two decimal places when mapping', () => {
			const prismaCategory = {
				id: 10,
				idLevel: 100,
				idCategory: 100,
				idProductPercentageCommission: 50,
				porcentajeDistribucion: new Decimal('0.15555'),
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			const domain = prismaCommissionRuleCategoryToDomain(prismaCategory)
			expect(domain.porcentajeDistribucion).toBeCloseTo(15.555, 4)
		})

		it('should handle string decimal values', () => {
			const prismaCategory = {
				id: 10,
				idLevel: 100,
				idCategory: 100,
				idProductPercentageCommission: 50,
				porcentajeDistribucion: '0.155', // String representation
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			const domain = prismaCommissionRuleCategoryToDomain(prismaCategory)
			expect(domain.porcentajeDistribucion).toBe(15.5)
		})

		it('should map nested category if present', () => {
			const prismaCategory = {
				id: 10,
				idLevel: 100,
				idCategory: 100,
				idProductPercentageCommission: 50,
				porcentajeDistribucion: mockDecimal(0.1),
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				category: {
					idCategory: 100,
					name: 'Test Category',
				},
			}

			const domain = prismaCommissionRuleCategoryToDomain(prismaCategory)
			expect(domain.category).toEqual({
				idLevel: 100,
				name: 'Test Category',
			})
		})

		it('should map porcentajePortfolio when present', () => {
			const prismaCategory = {
				id: 10,
				idLevel: 100,
				idCategory: 100,
				idProductPercentageCommission: 50,
				porcentajeDistribucion: mockDecimal(0.5),
				porcentajePortfolio: mockDecimal(0.2),
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			const domain = prismaCommissionRuleCategoryToDomain(prismaCategory)
			expect(domain.porcentajeDistribucion).toBe(50)
			expect(domain.porcentajePortfolio).toBe(20)
		})
	})

	describe('prismaCommissionRuleToDomain', () => {
		it('should map rule with categories', () => {
			const prismaRule = {
				idProductPercentageCommission: 1,
				idProductConfiguration: 5,
				description: 'Test Rule',
				active: true,
				hasPortfolio: false,
				createdAt: new Date('2023-01-01T00:00:00Z'),
				updatedAt: new Date('2023-01-01T00:00:00Z'),
				productPercentageCommissionCategories: [
					{
						id: 10,
						idLevel: 100,
						idCategory: 100,
						idProductPercentageCommission: 1,
						porcentajeDistribucion: mockDecimal(0.2),
						active: true,
						createdAt: new Date('2023-01-01T00:00:00Z'),
						updatedAt: new Date('2023-01-01T00:00:00Z'),
					},
				],
			}

			const domain = prismaCommissionRuleToDomain(prismaRule)

			expect(domain.id).toBe(1)
			expect(domain.description).toBe('Test Rule')
			expect(domain.hasPortfolio).toBe(false)
			expect(domain.categories).toHaveLength(1)
			expect(domain.categories[0].porcentajeDistribucion).toBe(20)
		})

		it('should map rule without categories', () => {
			const prismaRule = {
				idProductPercentageCommission: 2,
				idProductConfiguration: 5,
				description: null,
				active: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				// undefined categories
			}

			const domain = prismaCommissionRuleToDomain(prismaRule)
			expect(domain.hasPortfolio).toBe(false)
			expect(domain.categories).toEqual([])
		})
	})
})
