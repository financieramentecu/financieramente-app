import { describe, it, expect } from 'vitest'
import {
	prismaCategoryToCategory,
	prismaCategoryListToCategories,
} from '../../mappers/category.mapper'
import { createMockPrismaCategory } from '../fixtures/mock-category'

describe('category.mapper', () => {
	describe('prismaCategoryToCategory', () => {
		it('should transform Prisma Category to Category (happy path)', () => {
			const prismaCategory = createMockPrismaCategory({
				idCategory: 1,
				code: 'CAT001',
				name: 'Agente Experto',
				categoryType: {
					id: 1,
					name: 'MMS',
					description: 'Descripción completa',
					status: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				descripcion: 'Descripción completa',
				status: true,
			})

			const result = prismaCategoryToCategory(prismaCategory)

			expect(result.idCategory).toBe(1)
			expect(result.code).toBe('CAT001')
			expect(result.name).toBe('Agente Experto')
			expect(result.typeCategory).toBe('MMS')
			expect(result.descripcion).toBe('Descripción completa')
			expect(result.status).toBe(true)
		})

		it('should convert Date to ISO string', () => {
			const prismaCategory = createMockPrismaCategory({
				createdAt: new Date('2024-01-15T10:00:00.000Z'),
				updatedAt: new Date('2024-01-15T11:00:00.000Z'),
			})

			const result = prismaCategoryToCategory(prismaCategory)

			expect(typeof result.createdAt).toBe('string')
			expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z')
			expect(typeof result.updatedAt).toBe('string')
			expect(result.updatedAt).toBe('2024-01-15T11:00:00.000Z')
		})

		it('should handle null descripcion correctly', () => {
			const prismaCategory = createMockPrismaCategory({
				descripcion: null,
			})

			const result = prismaCategoryToCategory(prismaCategory)

			expect(result.descripcion).toBeNull()
		})

		it('should handle status as true', () => {
			const prismaCategory = createMockPrismaCategory({
				status: true,
			})

			const result = prismaCategoryToCategory(prismaCategory)

			expect(result.status).toBe(true)
		})

		it('should handle status as false', () => {
			const prismaCategory = createMockPrismaCategory({
				status: false,
			})

			const result = prismaCategoryToCategory(prismaCategory)

			expect(result.status).toBe(false)
		})

		it('should preserve all field values correctly', () => {
			const prismaCategory = createMockPrismaCategory({
				idCategory: 42,
				code: 'UNIQUE_CODE',
				name: 'Unique Name',
				categoryType: {
					id: 2,
					name: 'ALIADO',
					description: 'Unique description',
					status: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				descripcion: 'Unique description',
			})

			const result = prismaCategoryToCategory(prismaCategory)

			expect(result.idCategory).toBe(42)
			expect(result.code).toBe('UNIQUE_CODE')
			expect(result.name).toBe('Unique Name')
			expect(result.typeCategory).toBe('ALIADO')
			expect(result.descripcion).toBe('Unique description')
		})

		it('should handle typeCategory MMS', () => {
			const prismaCategory = createMockPrismaCategory({
				categoryType: {
					id: 1,
					name: 'MMS',
					description: null,
					status: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			})

			const result = prismaCategoryToCategory(prismaCategory)

			expect(result.typeCategory).toBe('MMS')
		})

		it('should handle typeCategory ALIADO', () => {
			const prismaCategory = createMockPrismaCategory({
				categoryType: {
					id: 2,
					name: 'ALIADO',
					description: null,
					status: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			})

			const result = prismaCategoryToCategory(prismaCategory)

			expect(result.typeCategory).toBe('ALIADO')
		})

		it('should handle typeCategory TRINITY', () => {
			const prismaCategory = createMockPrismaCategory({
				categoryType: {
					id: 3,
					name: 'TRINITY',
					description: null,
					status: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			})

			const result = prismaCategoryToCategory(prismaCategory)

			expect(result.typeCategory).toBe('TRINITY')
		})
	})

	describe('prismaCategoryListToCategories', () => {
		it('should transform list of Prisma categories to Categories array (happy path)', () => {
			const prismaCategories = [
				createMockPrismaCategory({
					idCategory: 1,
					code: 'CAT001',
					name: 'Agente Experto',
				}),
				createMockPrismaCategory({
					idCategory: 2,
					code: 'CAT002',
					name: 'Agente Básico',
				}),
			]

			const result = prismaCategoryListToCategories(prismaCategories)

			expect(result).toHaveLength(2)
			expect(result[0].idCategory).toBe(1)
			expect(result[0].code).toBe('CAT001')
			expect(result[0].name).toBe('Agente Experto')
			expect(result[1].idCategory).toBe(2)
			expect(result[1].code).toBe('CAT002')
			expect(result[1].name).toBe('Agente Básico')
		})

		it('should handle empty array', () => {
			const prismaCategories: (ReturnType<typeof createMockPrismaCategory>)[] = []

			const result = prismaCategoryListToCategories(prismaCategories)

			expect(result).toHaveLength(0)
			expect(result).toEqual([])
		})

		it('should transform single category in array', () => {
			const prismaCategories = [
				createMockPrismaCategory({
					idCategory: 1,
					code: 'CAT001',
					name: 'Agente Único',
				}),
			]

			const result = prismaCategoryListToCategories(prismaCategories)

			expect(result).toHaveLength(1)
			expect(result[0].idCategory).toBe(1)
			expect(result[0].code).toBe('CAT001')
			expect(result[0].name).toBe('Agente Único')
		})

		it('should preserve all category properties in list', () => {
			const prismaCategories = [
				createMockPrismaCategory({
					idCategory: 1,
					code: 'CAT001',
					name: 'Agente MMS',
					categoryType: {
						id: 1,
						name: 'MMS',
						description: 'Descripción 1',
						status: true,
						createdAt: new Date(),
						updatedAt: new Date()
					},
					descripcion: 'Descripción 1',
					status: true,
				}),
				createMockPrismaCategory({
					idCategory: 2,
					code: 'CAT002',
					name: 'Agente Aliado',
					categoryType: {
						id: 2,
						name: 'ALIADO',
						description: null,
						status: true,
						createdAt: new Date(),
						updatedAt: new Date()
					},
					descripcion: null,
					status: false,
				}),
			]

			const result = prismaCategoryListToCategories(prismaCategories)

			expect(result[0].typeCategory).toBe('MMS')
			expect(result[0].descripcion).toBe('Descripción 1')
			expect(result[0].status).toBe(true)
			expect(result[1].typeCategory).toBe('ALIADO')
			expect(result[1].descripcion).toBeNull()
			expect(result[1].status).toBe(false)
		})

		it('should maintain order of categories', () => {
			const prismaCategories = [
				createMockPrismaCategory({ idCategory: 3, code: 'CAT003' }),
				createMockPrismaCategory({ idCategory: 1, code: 'CAT001' }),
				createMockPrismaCategory({ idCategory: 2, code: 'CAT002' }),
			]

			const result = prismaCategoryListToCategories(prismaCategories)

			expect(result[0].idCategory).toBe(3)
			expect(result[1].idCategory).toBe(1)
			expect(result[2].idCategory).toBe(2)
		})
	})
})
