import { describe, it, expect } from 'vitest'
import {
	createCategorySchema,
	updateCategorySchema,
} from '../../lib/category-schemas'

describe('category-schemas', () => {
	describe('createCategorySchema', () => {
		it('should validate valid category data (happy path)', () => {
			const validData = {
				code: 'CAT001',
				name: 'Agente Experto',
				typeCategory: 'MMS' as const,
				descripcion: 'Descripción de la categoría',
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.code).toBe('CAT001')
				expect(result.data.name).toBe('Agente Experto')
				expect(result.data.typeCategory).toBe('MMS')
				expect(result.data.status).toBe(true)
			}
		})

		it('should trim whitespace from code and name', () => {
			const data = {
				code: '  CAT001  ',
				name: '  Agente Experto  ',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.code).toBe('CAT001')
				expect(result.data.name).toBe('Agente Experto')
			}
		})

		it('should reject empty code', () => {
			const data = {
				code: '',
				name: 'Agente Experto',
				typeCategory: 'MMS' as const,
				status: true,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('requerido')
			}
		})

		it('should reject code longer than 20 characters', () => {
			const data = {
				code: 'A'.repeat(21),
				name: 'Agente Experto',
				typeCategory: 'MMS' as const,
				status: true,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('20 caracteres')
			}
		})

		it('should accept code with exactly 20 characters', () => {
			const data = {
				code: 'A'.repeat(20),
				name: 'Agente Experto',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject empty name', () => {
			const data = {
				code: 'CAT001',
				name: '',
				typeCategory: 'MMS' as const,
				status: true,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('2 caracteres')
			}
		})

		it('should reject name shorter than 2 characters', () => {
			const data = {
				code: 'CAT001',
				name: 'A',
				typeCategory: 'MMS' as const,
				status: true,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('2 caracteres')
			}
		})

		it('should reject name longer than 50 characters', () => {
			const data = {
				code: 'CAT001',
				name: 'A'.repeat(51),
				typeCategory: 'MMS' as const,
				status: true,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('50 caracteres')
			}
		})

		it('should accept name with exactly 2 characters', () => {
			const data = {
				code: 'CAT001',
				name: 'AB',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should accept name with exactly 50 characters', () => {
			const data = {
				code: 'CAT001',
				name: 'A'.repeat(50),
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate typeCategory enum MMS', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate typeCategory enum ALIADO', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'ALIADO' as const,
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate typeCategory enum TRINITY', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'TRINITY' as const,
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})



		it('should accept optional descripcion as null', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				descripcion: null,
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.descripcion).toBeNull()
			}
		})

		it('should accept optional descripcion as undefined', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should accept descripcion as string', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				descripcion: 'Esta es una descripción',
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.descripcion).toBe('Esta es una descripción')
			}
		})

		it('should validate status as boolean', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: false,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.status).toBe(false)
			}
		})

		it('should reject missing required fields', () => {
			const data = {
				code: 'CAT001',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const nameError = result.error.issues.find(
					(issue) => issue.path[0] === 'name'
				)
				const typeCategoryError = result.error.issues.find(
					(issue) => issue.path[0] === 'typeCategory'
				)
				const statusError = result.error.issues.find(
					(issue) => issue.path[0] === 'status'
				)
				expect(nameError).toBeDefined()
				expect(typeCategoryError).toBeDefined()
				expect(statusError).toBeDefined()
			}
		})
	})

	describe('beneficiaryMode and idFixedBeneficiaryUser validation (legacy coverage — updated to new enum names)', () => {
		it('should fail when BENEFICIARIO_GENERAL and idFixedBeneficiaryUser is null', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
				beneficiaryMode: 'BENEFICIARIO_GENERAL' as const,
				idFixedBeneficiaryUser: null,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const issue = result.error.issues.find(
					(i) => i.path[0] === 'idFixedBeneficiaryUser'
				)
				expect(issue).toBeDefined()
				expect(issue?.message).toContain('requerido')
			}
		})

		it('should fail when BENEFICIARIO_GENERAL and idFixedBeneficiaryUser is undefined', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
				beneficiaryMode: 'BENEFICIARIO_GENERAL' as const,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const issue = result.error.issues.find(
					(i) => i.path[0] === 'idFixedBeneficiaryUser'
				)
				expect(issue).toBeDefined()
			}
		})

		it('should pass when OVERRIDE and idFixedBeneficiaryUser is null', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
				beneficiaryMode: 'OVERRIDE' as const,
				idFixedBeneficiaryUser: null,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should pass when OVERRIDE and idFixedBeneficiaryUser is undefined', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
				beneficiaryMode: 'OVERRIDE' as const,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should pass when BENEFICIARIO_GENERAL and idFixedBeneficiaryUser is a valid positive integer', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
				beneficiaryMode: 'BENEFICIARIO_GENERAL' as const,
				idFixedBeneficiaryUser: 42,
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.beneficiaryMode).toBe('BENEFICIARIO_GENERAL')
				expect(result.data.idFixedBeneficiaryUser).toBe(42)
			}
		})

		it('should default beneficiaryMode to OVERRIDE when not provided', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
			}

			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.beneficiaryMode).toBe('OVERRIDE')
			}
		})
	})

	describe('color field validation', () => {
		it('should fail when color is missing', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				// color intentionally omitted
			}
			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const colorError = result.error.issues.find((i) => i.path[0] === 'color')
				expect(colorError).toBeDefined()
			}
		})

		it('should fail when color is not a valid hex color', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: 'red',
			}
			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const colorError = result.error.issues.find((i) => i.path[0] === 'color')
				expect(colorError).toBeDefined()
			}
		})

		it('should pass when color is a valid 6-digit hex color', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
			}
			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})
	})

	describe('BENEFICIARIO_GENERAL and OVERRIDE beneficiaryMode validation', () => {
		it('should fail when BENEFICIARIO_GENERAL and idFixedBeneficiaryUser is missing', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
				beneficiaryMode: 'BENEFICIARIO_GENERAL' as const,
			}
			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const issue = result.error.issues.find(
					(i) => i.path[0] === 'idFixedBeneficiaryUser'
				)
				expect(issue).toBeDefined()
			}
		})

		it('should pass when OVERRIDE mode without user', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
				beneficiaryMode: 'OVERRIDE' as const,
			}
			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should default beneficiaryMode to OVERRIDE when not provided', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
			}
			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.beneficiaryMode).toBe('OVERRIDE')
			}
		})
	})

	describe('idNextCategory field validation', () => {
		it('should pass when idNextCategory is not provided (optional)', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
			}
			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should pass when idNextCategory is a positive integer', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
				idNextCategory: 5,
			}
			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.idNextCategory).toBe(5)
			}
		})

		it('should pass when idNextCategory is null', () => {
			const data = {
				code: 'CAT001',
				name: 'Agente',
				typeCategory: 'MMS' as const,
				status: true,
				color: '#FF5733',
				idNextCategory: null,
			}
			const result = createCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})
	})

	describe('updateCategorySchema', () => {
		it('should validate with all fields (happy path)', () => {
			const data = {
				code: 'CAT002',
				name: 'Agente Actualizado',
				typeCategory: 'ALIADO' as const,
				descripcion: 'Nueva descripción',
				status: false,
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only code', () => {
			const data = {
				code: 'CAT002',
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only name', () => {
			const data = {
				name: 'Agente Actualizado',
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only typeCategory', () => {
			const data = {
				typeCategory: 'TRINITY' as const,
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only descripcion', () => {
			const data = {
				descripcion: 'Nueva descripción',
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only status', () => {
			const data = {
				status: false,
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate empty object (partial update)', () => {
			const data = {}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject code shorter than 1 character when provided', () => {
			const data = {
				code: '',
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('requerido')
			}
		})

		it('should reject code longer than 20 characters when provided', () => {
			const data = {
				code: 'A'.repeat(21),
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('20 caracteres')
			}
		})

		it('should reject name shorter than 2 characters when provided', () => {
			const data = {
				name: 'A',
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('2 caracteres')
			}
		})

		it('should reject name longer than 50 characters when provided', () => {
			const data = {
				name: 'A'.repeat(51),
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('50 caracteres')
			}
		})

		it('should trim whitespace from string fields', () => {
			const data = {
				code: '  CAT002  ',
				name: '  Agente Actualizado  ',
			}

			const result = updateCategorySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.code).toBe('CAT002')
				expect(result.data.name).toBe('Agente Actualizado')
			}
		})


	})
})
