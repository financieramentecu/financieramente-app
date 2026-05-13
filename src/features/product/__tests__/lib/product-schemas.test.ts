import { describe, it, expect } from 'vitest'
import {
	createProductSchema,
	updateProductSchema,
} from '../../lib/product-schemas'

describe('product-schemas', () => {
	describe('createProductSchema', () => {
		it('should validate valid product data (happy path)', () => {
			const validData = {
				name: 'Seguro de Vida',
				idCompany: 1,
				status: true,
				commissionPercentage: 76.5,
				contributionType: 'UNICO',
			}

			const result = createProductSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Seguro de Vida')
				expect(result.data.idCompany).toBe(1)
				expect(result.data.status).toBe(true)
				expect(result.data.commissionPercentage).toBe(76.5)
				expect(result.data.contributionType).toBe('UNICO')
			}
		})

		it('should trim whitespace from name', () => {
			const data = {
				name: '  Seguro de Vida  ',
				idCompany: 1,
				status: true,
				contributionType: 'REGULAR',
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Seguro de Vida')
			}
		})

		it('should reject empty name', () => {
			const data = {
				name: '',
				idCompany: 1,
				status: true,
				contributionType: 'REGULAR',
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('obligatorio')
			}
		})

		it('should accept name with exactly 1 character', () => {
			const data = {
				name: 'A',
				idCompany: 1,
				status: true,
				contributionType: 'REGULAR',
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject name longer than 200 characters', () => {
			const data = {
				name: 'A'.repeat(201),
				idCompany: 1,
				status: true,
				contributionType: 'REGULAR',
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('200 caracteres')
			}
		})

		it('should accept name with exactly 200 characters', () => {
			const data = {
				name: 'A'.repeat(200),
				idCompany: 1,
				status: true,
				contributionType: 'REGULAR',
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject missing idCompany', () => {
			const data = {
				name: 'Seguro de Vida',
				status: true,
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const idCompanyError = result.error.issues.find(
					(issue) => issue.path[0] === 'idCompany'
				)
				expect(idCompanyError).toBeDefined()
			}
		})

		it('should reject zero idCompany', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 0,
				status: true,
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const idCompanyError = result.error.issues.find(
					(issue) => issue.path[0] === 'idCompany'
				)
				expect(idCompanyError).toBeDefined()
			}
		})

		it('should reject negative idCompany', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: -1,
				status: true,
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const idCompanyError = result.error.issues.find(
					(issue) => issue.path[0] === 'idCompany'
				)
				expect(idCompanyError).toBeDefined()
			}
		})

		it('should reject non-integer idCompany', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1.5,
				status: true,
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const idCompanyError = result.error.issues.find(
					(issue) => issue.path[0] === 'idCompany'
				)
				expect(idCompanyError).toBeDefined()
			}
		})

		it('should accept optional description', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1,
				description: 'Mi descripción',
				status: true,
				contributionType: 'REGULAR',
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.description).toBe('Mi descripción')
			}
		})

		it('should accept optional idTypeProduct', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1,
				idTypeProduct: 5,
				status: true,
				contributionType: 'REGULAR',
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.idTypeProduct).toBe(5)
			}
		})

		it('should default status to true and commissionPercentage to 0', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1,
				contributionType: 'REGULAR',
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.status).toBe(true)
				expect(result.data.commissionPercentage).toBe(0)
			}
		})

		it('should reject commissionPercentage greater than 100', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1,
				commissionPercentage: 101,
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject negative commissionPercentage', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1,
				commissionPercentage: -1,
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject invalid contributionType', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1,
				contributionType: 'INVALID',
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should reject omitted contributionType on create (field is required)', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1,
				// contributionType intentionally omitted
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const ctError = result.error.issues.find(
					(issue) => issue.path[0] === 'contributionType'
				)
				expect(ctError).toBeDefined()
			}
		})

		it('should reject contributionType = "OTRO" on create', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1,
				contributionType: 'OTRO',
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const ctError = result.error.issues.find(
					(issue) => issue.path[0] === 'contributionType'
				)
				expect(ctError).toBeDefined()
			}
		})

		it('should reject commissionPercentage = -1', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1,
				contributionType: 'REGULAR',
				commissionPercentage: -1,
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const cpError = result.error.issues.find(
					(issue) => issue.path[0] === 'commissionPercentage'
				)
				expect(cpError).toBeDefined()
			}
		})

		it('should reject commissionPercentage = 101', () => {
			const data = {
				name: 'Seguro de Vida',
				idCompany: 1,
				contributionType: 'REGULAR',
				commissionPercentage: 101,
			}

			const result = createProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const cpError = result.error.issues.find(
					(issue) => issue.path[0] === 'commissionPercentage'
				)
				expect(cpError).toBeDefined()
			}
		})
	})

	describe('updateProductSchema', () => {
		it('should validate with all fields (happy path)', () => {
			const data = {
				name: 'Seguro Actualizado',
				idCompany: 2,
				status: false,
			}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only name', () => {
			const data = {
				name: 'Seguro Actualizado',
			}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only idCompany', () => {
			const data = {
				idCompany: 2,
			}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only status', () => {
			const data = {
				status: false,
			}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate empty object (partial update)', () => {
			const data = {}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject name longer than 200 characters', () => {
			const data = {
				name: 'A'.repeat(201),
			}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('200 caracteres')
			}
		})

		it('should accept empty name string (as optional in update)', () => {
			const data = {
				name: '',
			}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(false)
		})

		it('should trim whitespace from name', () => {
			const data = {
				name: '  Seguro Actualizado  ',
			}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Seguro Actualizado')
			}
		})

		it('should reject zero idCompany', () => {
			const data = {
				idCompany: 0,
			}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const idCompanyError = result.error.issues.find(
					(issue) => issue.path[0] === 'idCompany'
				)
				expect(idCompanyError).toBeDefined()
			}
		})

		it('should reject negative idCompany', () => {
			const data = {
				idCompany: -1,
			}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const idCompanyError = result.error.issues.find(
					(issue) => issue.path[0] === 'idCompany'
				)
				expect(idCompanyError).toBeDefined()
			}
		})

		it('should reject non-integer idCompany', () => {
			const data = {
				idCompany: 1.5,
			}

			const result = updateProductSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				const idCompanyError = result.error.issues.find(
					(issue) => issue.path[0] === 'idCompany'
				)
				expect(idCompanyError).toBeDefined()
			}
		})
	})
})
