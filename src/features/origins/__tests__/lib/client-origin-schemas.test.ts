import { describe, it, expect } from 'vitest'
import {
	createClientOriginSchema,
	updateClientOriginSchema,
} from '../../lib/origins-schemas'

describe('client-origin-schemas', () => {
	describe('createClientOriginSchema', () => {
		it('should validate valid client origin data (happy path)', () => {
			const validData = {
				name: 'Propio',
				description: 'Origen propio',
				status: true,
			}

			const result = createClientOriginSchema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Propio')
				expect(result.data.description).toBe('Origen propio')
				expect(result.data.status).toBe(true)
			}
		})

		it('should default status to true when not provided', () => {
			const data = {
				name: 'Propio',
			}

			const result = createClientOriginSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.status).toBe(true)
			}
		})

		it('should trim whitespace from name', () => {
			const data = {
				name: '  Propio  ',
				status: true,
			}

			const result = createClientOriginSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Propio')
			}
		})

		it('should reject empty name', () => {
			const data = {
				name: '',
				status: true,
			}

			const result = createClientOriginSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('2 caracteres')
			}
		})

		it('should reject name shorter than 2 characters', () => {
			const data = {
				name: 'A',
				status: true,
			}

			const result = createClientOriginSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('2 caracteres')
			}
		})

		it('should reject name longer than 100 characters', () => {
			const data = {
				name: 'A'.repeat(101),
				status: true,
			}

			const result = createClientOriginSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('100 caracteres')
			}
		})

		it('should accept optional description', () => {
			const data = {
				name: 'Propio',
				status: true,
			}

			const result = createClientOriginSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should accept status as false', () => {
			const data = {
				name: 'Propio',
				status: false,
			}

			const result = createClientOriginSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.status).toBe(false)
			}
		})
	})

	describe('updateClientOriginSchema', () => {
		it('should validate with all fields (happy path)', () => {
			const data = {
				name: 'Actualizado',
				description: 'Descripción actualizada',
				status: false,
			}

			const result = updateClientOriginSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only name', () => {
			const data = {
				name: 'Actualizado',
			}

			const result = updateClientOriginSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only description', () => {
			const data = {
				description: 'Nueva descripción',
			}

			const result = updateClientOriginSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate with only status', () => {
			const data = {
				status: false,
			}

			const result = updateClientOriginSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should validate empty object (partial update)', () => {
			const data = {}

			const result = updateClientOriginSchema.safeParse(data)
			expect(result.success).toBe(true)
		})

		it('should reject name shorter than 2 characters', () => {
			const data = {
				name: 'A',
			}

			const result = updateClientOriginSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('2 caracteres')
			}
		})

		it('should reject name longer than 100 characters', () => {
			const data = {
				name: 'A'.repeat(101),
			}

			const result = updateClientOriginSchema.safeParse(data)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('100 caracteres')
			}
		})

		it('should trim whitespace from name', () => {
			const data = {
				name: '  Actualizado  ',
			}

			const result = updateClientOriginSchema.safeParse(data)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe('Actualizado')
			}
		})
	})
})
