import { describe, it, expect } from 'vitest'
import {
	createCompanySchema,
	updateCompanySchema,
} from '../../lib/company-schemas'

describe('company-schemas', () => {
	describe('createCompanySchema', () => {
		it('should validate valid company data with string currency id', () => {
			const validData = {
				name: 'Skandia Seguros',
				status: true,
				idCurrency: '1',
			}

			const result = createCompanySchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Skandia Seguros')
				expect(result.data.status).toBe(true)
				expect(result.data.idCurrency).toBe('1')
			}
		})

		it('should validate valid company data with numeric currency id (coerced)', () => {
			const validData = {
				name: 'Skandia Seguros',
				status: true,
				idCurrency: 1,
			}

			const result = createCompanySchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.idCurrency).toBe('1')
			}
		})

		it('should trim whitespace from name', () => {
			const data = {
				name: '  Skandia Seguros  ',
				status: true,
				idCurrency: '1',
			}

			const result = createCompanySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Skandia Seguros')
			}
		})

		it('should reject empty name', () => {
			const data = {
				name: '',
				status: true,
				idCurrency: '1',
			}

			const result = createCompanySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('obligatorio')
			}
		})

		it('should reject name longer than 100 characters', () => {
			const data = {
				name: 'A'.repeat(101),
				status: true,
				idCurrency: '1',
			}

			const result = createCompanySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('100 caracteres')
			}
		})

		it('should reject missing status', () => {
			const data = {
				name: 'Skandia Seguros',
			}

			const result = createCompanySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues.length).toBeGreaterThan(0)
				const statusError = result.error.issues.find(
					(issue) => issue.path[0] === 'status'
				)
				expect(statusError).toBeDefined()
			}
		})

		it('should accept status as false', () => {
			const data = {
				name: 'Skandia Seguros',
				status: false,
				idCurrency: '1',
			}

			const result = createCompanySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.status).toBe(false)
			}
		})

		it('should accept name with exactly 100 characters', () => {
			const data = {
				name: 'A'.repeat(100),
				status: true,
				idCurrency: '1',
			}

			const result = createCompanySchema.safeParse(data)
			expect(result.success).toBe(true)
		})
	})

	describe('updateCompanySchema', () => {
		it('should validate with all fields and string currency id', () => {
			const data = {
				name: 'Skandia Seguros',
				status: true,
				idCurrency: '1',
			}

			const result = updateCompanySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.idCurrency).toBe('1')
			}
		})

		it('should validate with numeric currency id (coerced)', () => {
			const data = {
				idCurrency: 1,
			}

			const result = updateCompanySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.idCurrency).toBe('1')
			}
		})

		it('should validate with only name', () => {
			const data = {
				name: 'Skandia Seguros',
			}

			const result = updateCompanySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only status', () => {
			const data = {
				status: false,
			}

			const result = updateCompanySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate empty object (partial update)', () => {
			const data = {}

			const result = updateCompanySchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject name longer than 100 characters', () => {
			const data = {
				name: 'A'.repeat(101),
			}

			const result = updateCompanySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('100 caracteres')
			}
		})

		it('should reject empty name string', () => {
			const data = {
				name: '',
			}

			const result = updateCompanySchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('obligatorio')
			}
		})

		it('should trim whitespace from name', () => {
			const data = {
				name: '  Skandia Seguros  ',
			}

			const result = updateCompanySchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Skandia Seguros')
			}
		})
	})
})
