import { describe, it, expect } from 'vitest'
import {
	createEmpresaSchema,
	updateEmpresaSchema,
} from '../../lib/empresa-schemas'

describe('empresa-schemas', () => {
	describe('createEmpresaSchema', () => {
		it('should validate valid empresa data', () => {
			const validData = {
				name: 'Skandia Seguros',
				status: true,
			}

			const result = createEmpresaSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Skandia Seguros')
				expect(result.data.status).toBe(true)
			}
		})

		it('should trim whitespace from name', () => {
			const data = {
				name: '  Skandia Seguros  ',
				status: true,
			}

			const result = createEmpresaSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Skandia Seguros')
			}
		})

		it('should reject empty name', () => {
			const data = {
				name: '',
				status: true,
			}

			const result = createEmpresaSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('obligatorio')
			}
		})

		it('should reject name longer than 100 characters', () => {
			const data = {
				name: 'A'.repeat(101),
				status: true,
			}

			const result = createEmpresaSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('100 caracteres')
			}
		})

		it('should reject missing status', () => {
			const data = {
				name: 'Skandia Seguros',
			}

			const result = createEmpresaSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				// Zod returns a default error message for missing boolean
				// The error should indicate that status is required
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
			}

			const result = createEmpresaSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.status).toBe(false)
			}
		})

		it('should accept name with exactly 100 characters', () => {
			const data = {
				name: 'A'.repeat(100),
				status: true,
			}

			const result = createEmpresaSchema.safeParse(data)
			expect(result.success).toBe(true)
		})
	})

	describe('updateEmpresaSchema', () => {
		it('should validate with all fields', () => {
			const data = {
				name: 'Skandia Seguros',
				status: true,
			}

			const result = updateEmpresaSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only name', () => {
			const data = {
				name: 'Skandia Seguros',
			}

			const result = updateEmpresaSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only status', () => {
			const data = {
				status: false,
			}

			const result = updateEmpresaSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate empty object (partial update)', () => {
			const data = {}

			const result = updateEmpresaSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject name longer than 100 characters', () => {
			const data = {
				name: 'A'.repeat(101),
			}

			const result = updateEmpresaSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('100 caracteres')
			}
		})

		it('should reject empty name string', () => {
			const data = {
				name: '',
			}

			const result = updateEmpresaSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('obligatorio')
			}
		})

		it('should trim whitespace from name', () => {
			const data = {
				name: '  Skandia Seguros  ',
			}

			const result = updateEmpresaSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Skandia Seguros')
			}
		})
	})
})

