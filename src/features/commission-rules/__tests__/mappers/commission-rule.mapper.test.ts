import { describe, it, expect } from 'vitest'
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
				idCategory: 100,
				idProductPercentageCommission: 50,
				porcentajeDistribucion: mockDecimal(15.5),
				active: true,
				createdAt: new Date('2023-01-01T10:00:00Z'),
				updatedAt: new Date('2023-01-02T10:00:00Z'),
			}

			const domain = prismaCommissionRuleCategoryToDomain(prismaCategory)

			expect(domain).toEqual({
				id: 10,
				idCategory: 100,
				idProductPercentageCommission: 50,
				porcentajeDistribucion: 15.5,
				active: true,
				createdAt: '2023-01-01T10:00:00.000Z',
				updatedAt: '2023-01-02T10:00:00.000Z',
				category: undefined,
			})
		})

		it('should map nested category if present', () => {
			const prismaCategory = {
				id: 10,
				idCategory: 100,
				idProductPercentageCommission: 50,
				porcentajeDistribucion: mockDecimal(10),
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
				idCategory: 100,
				name: 'Test Category',
			})
		})
	})

	describe('prismaCommissionRuleToDomain', () => {
		it('should map rule with categories', () => {
			const prismaRule = {
				idProductPercentageCommission: 1,
				idProductConfiguration: 5,
				description: 'Test Rule',
				active: true,
				createdAt: new Date('2023-01-01T00:00:00Z'),
				updatedAt: new Date('2023-01-01T00:00:00Z'),
				productPercentageCommissionCategories: [
					{
						id: 10,
						idCategory: 100,
						idProductPercentageCommission: 1,
						porcentajeDistribucion: mockDecimal(20),
						active: true,
						createdAt: new Date('2023-01-01T00:00:00Z'),
						updatedAt: new Date('2023-01-01T00:00:00Z'),
					},
				],
			}

			const domain = prismaCommissionRuleToDomain(prismaRule)

			expect(domain.id).toBe(1)
			expect(domain.description).toBe('Test Rule')
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
			expect(domain.categories).toEqual([])
		})
	})
})
