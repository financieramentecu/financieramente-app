import { describe, it, expect } from 'vitest'
import { updateUserSchema } from '../user-schemas'

describe('updateUserSchema', () => {
	const userId = 1

	describe('levelId field', () => {
		it('should accept a valid levelId', () => {
			const schema = updateUserSchema(null, userId)
			const result = schema.safeParse({ levelId: 5 })
			expect(result.success).toBe(true)
		})

		it('should accept null levelId', () => {
			const schema = updateUserSchema(null, userId)
			const result = schema.safeParse({ levelId: null })
			expect(result.success).toBe(true)
		})

		it('should accept undefined levelId (omitted)', () => {
			const schema = updateUserSchema(null, userId)
			const result = schema.safeParse({})
			expect(result.success).toBe(true)
		})

		it('should reject non-integer levelId', () => {
			const schema = updateUserSchema(null, userId)
			const result = schema.safeParse({ levelId: 1.5 })
			expect(result.success).toBe(false)
		})

		it('should reject non-positive levelId', () => {
			const schema = updateUserSchema(null, userId)
			const result = schema.safeParse({ levelId: 0 })
			expect(result.success).toBe(false)
		})
	})

	describe('categoryId field', () => {
		it('should accept a valid categoryId', () => {
			const schema = updateUserSchema(null, userId)
			const result = schema.safeParse({ categoryId: 3 })
			expect(result.success).toBe(true)
		})

		it('should accept null categoryId for non-AGENTE role', () => {
			const schema = updateUserSchema('ADMIN', userId)
			const result = schema.safeParse({ categoryId: null })
			expect(result.success).toBe(true)
		})

		it('should reject null categoryId when role is AGENTE', () => {
			const schema = updateUserSchema('AGENTE', userId)
			const result = schema.safeParse({ categoryId: null })
			expect(result.success).toBe(false)
		})
	})

	describe('leaderId field', () => {
		it('should accept a valid leaderId', () => {
			const schema = updateUserSchema(null, userId)
			const result = schema.safeParse({ leaderId: 2 })
			expect(result.success).toBe(true)
		})

		it('should reject leaderId equal to userId (self-leader)', () => {
			const schema = updateUserSchema(null, userId)
			const result = schema.safeParse({ leaderId: userId })
			expect(result.success).toBe(false)
		})

		it('should accept null leaderId', () => {
			const schema = updateUserSchema(null, userId)
			const result = schema.safeParse({ leaderId: null })
			expect(result.success).toBe(true)
		})
	})

	describe('combined fields', () => {
		it('should accept all valid fields together', () => {
			const schema = updateUserSchema('AGENTE', userId)
			const result = schema.safeParse({
				active: true,
				roleId: 2,
				categoryId: 3,
				levelId: 5,
				leaderId: 99,
			})
			expect(result.success).toBe(true)
		})
	})
})
