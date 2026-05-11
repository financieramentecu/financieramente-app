import { describe, it, expect } from 'vitest'
import {
	createCategorySchema,
	updateCategorySchema,
} from '../../lib/category-schemas'

describe('category-schemas', () => {
	describe('createCategorySchema', () => {
		it('should validate valid category data (happy path)', () => {
			const validData = {
				name: 'Categoría Experta',
				idCategoryType: 1,
				description: 'Descripción de la categoría',
				status: true,
			}

			const result = createCategorySchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Categoría Experta')
				expect(result.data.idCategoryType).toBe(1)
				expect(result.data.status).toBe(true)
			}
		})

		it('should trim whitespace from name', () => {
			const data = {
				name: '  Categoría Experta  ',
				idCategoryType: 1,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Categoría Experta')
			}
		})

		it('should reject empty name', () => {
			const data = {
				name: '',
				idCategoryType: 1,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('requerido')
			}
		})

		it('should reject name shorter than 2 characters', () => {
			const data = {
				name: 'A',
				idCategoryType: 1,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('2 caracteres')
			}
		})

		it('should reject name longer than 100 characters', () => {
			const data = {
				name: 'A'.repeat(101),
				idCategoryType: 1,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('100 caracteres')
			}
		})

		it('should accept name with exactly 2 characters', () => {
			const data = {
				name: 'AB',
				idCategoryType: 1,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should accept name with exactly 100 characters', () => {
			const data = {
				name: 'A'.repeat(100),
				idCategoryType: 1,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should require idCategoryType as a positive integer', () => {
			const data = {
				name: 'Categoría',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const err = result.error.issues.find(
					(i) => i.path[0] === 'idCategoryType'
				)
				expect(err).toBeDefined()
			}
		})

		it('should reject idCategoryType = 0 (non-positive)', () => {
			const data = {
				name: 'Categoría',
				idCategoryType: 0,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject idCategoryType = -1 (negative)', () => {
			const data = {
				name: 'Categoría',
				idCategoryType: -1,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should accept optional description as null', () => {
			const data = {
				name: 'Categoría',
				idCategoryType: 1,
				description: null,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.description).toBeNull()
			}
		})

		it('should accept optional description as undefined', () => {
			const data = {
				name: 'Categoría',
				idCategoryType: 1,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should accept description as string', () => {
			const data = {
				name: 'Categoría',
				idCategoryType: 1,
				description: 'Esta es una descripción',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.description).toBe('Esta es una descripción')
			}
		})

		it('should default status to true when not provided', () => {
			const data = {
				name: 'Categoría',
				idCategoryType: 1,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.status).toBe(true)
			}
		})

		it('should accept status as false', () => {
			const data = {
				name: 'Categoría',
				idCategoryType: 1,
				status: false,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.status).toBe(false)
			}
		})

		it('should reject missing name', () => {
			const data = {
				idCategoryType: 1,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const nameErr = result.error.issues.find((i) => i.path[0] === 'name')
				expect(nameErr).toBeDefined()
			}
		})
	})

	describe('updateCategorySchema', () => {
		it('should validate with all fields (happy path)', () => {
			const data = {
				name: 'Categoría Actualizada',
				idCategoryType: 2,
				description: 'Nueva descripción',
				status: false,
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only name', () => {
			const data = { name: 'Actualizada' }

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only idCategoryType', () => {
			const data = { idCategoryType: 3 }

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only status', () => {
			const data = { status: false }

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate empty object (partial update)', () => {
			const data = {}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject name shorter than 2 characters when provided', () => {
			const data = { name: 'A' }

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('2 caracteres')
			}
		})

		it('should reject name longer than 100 characters when provided', () => {
			const data = { name: 'A'.repeat(101) }

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('100 caracteres')
			}
		})

		it('should trim whitespace from name field', () => {
			const data = { name: '  Categoría Actualizada  ' }

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Categoría Actualizada')
			}
		})

		it('should reject idCategoryType = 0 when provided', () => {
			const data = { idCategoryType: 0 }

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
		})
	})
})
