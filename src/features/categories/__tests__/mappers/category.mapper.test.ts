import { describe, it, expect } from 'vitest'
import {
	prismaCategoryToCategory,
	prismaCategoryListToCategories,
} from '../../mappers/category.mapper'
import { createMockPrismaCategory } from '../fixtures/mock-category'

describe('category.mapper', () => {
	describe('prismaCategoryToCategory', () => {
		it('should map a Prisma category to domain Category (happy path)', () => {
			const now = new Date('2024-01-15T10:00:00.000Z')
			const prisma = createMockPrismaCategory({
				id: 1,
				name: 'Categoría Test',
				description: 'Una descripción',
				status: true,
				idCategoryType: 2,
				createdAt: now,
				updatedAt: now,
			})

			const result = prismaCategoryToCategory(prisma)

			expect(result.id).toBe(1)
			expect(result.name).toBe('Categoría Test')
			expect(result.description).toBe('Una descripción')
			expect(result.status).toBe(true)
			expect(result.idCategoryType).toBe(2)
			expect(result.createdAt).toBe(now.toISOString())
			expect(result.updatedAt).toBe(now.toISOString())
		})

		it('should map categoryType relation when present', () => {
			const prisma = createMockPrismaCategory({
				categoryType: { name: 'Tipo Especial' },
			})

			const result = prismaCategoryToCategory(prisma)

			expect(result.categoryType).toEqual({ name: 'Tipo Especial' })
		})

		it('should set categoryType to undefined when not present', () => {
			const prisma = createMockPrismaCategory()

			const result = prismaCategoryToCategory(prisma)

			expect(result.categoryType).toBeUndefined()
		})

		it('should handle null description', () => {
			const prisma = createMockPrismaCategory({ description: null })

			const result = prismaCategoryToCategory(prisma)

			expect(result.description).toBeNull()
		})

		it('should convert Date objects to ISO strings', () => {
			const now = new Date('2024-06-15T12:30:00.000Z')
			const prisma = createMockPrismaCategory({ createdAt: now, updatedAt: now })

			const result = prismaCategoryToCategory(prisma)

			expect(result.createdAt).toBe('2024-06-15T12:30:00.000Z')
			expect(result.updatedAt).toBe('2024-06-15T12:30:00.000Z')
		})

		it('should map status = false correctly', () => {
			const prisma = createMockPrismaCategory({ status: false })

			const result = prismaCategoryToCategory(prisma)

			expect(result.status).toBe(false)
		})
	})

	describe('prismaCategoryListToCategories', () => {
		it('should map a list of Prisma categories', () => {
			const list = [
				createMockPrismaCategory({ id: 1, name: 'Categoría A' }),
				createMockPrismaCategory({ id: 2, name: 'Categoría B' }),
			]

			const result = prismaCategoryListToCategories(list)

			expect(result).toHaveLength(2)
			expect(result[0].id).toBe(1)
			expect(result[0].name).toBe('Categoría A')
			expect(result[1].id).toBe(2)
			expect(result[1].name).toBe('Categoría B')
		})

		it('should return empty array for empty list', () => {
			const result = prismaCategoryListToCategories([])

			expect(result).toHaveLength(0)
		})

		it('should maintain list order', () => {
			const list = [
				createMockPrismaCategory({ id: 3, name: 'C' }),
				createMockPrismaCategory({ id: 1, name: 'A' }),
				createMockPrismaCategory({ id: 2, name: 'B' }),
			]

			const result = prismaCategoryListToCategories(list)

			expect(result[0].id).toBe(3)
			expect(result[1].id).toBe(1)
			expect(result[2].id).toBe(2)
		})
	})
})
