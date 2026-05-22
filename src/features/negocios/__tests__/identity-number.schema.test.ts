import { describe, it, expect } from 'vitest'
import { identityNumberSchema } from '../lib/identity-number.schema'

describe('identityNumberSchema', () => {
	describe('valid inputs', () => {
		it('accepts a plain 5-digit number', () => {
			const r = identityNumberSchema.safeParse('12345')
			expect(r.success).toBe(true)
		})

		it('accepts a number with dots', () => {
			const r = identityNumberSchema.safeParse('12.345.678')
			expect(r.success).toBe(true)
		})

		it('accepts alphanumeric with hyphen prefix', () => {
			const r = identityNumberSchema.safeParse('A-12345678')
			expect(r.success).toBe(true)
		})

		it('accepts country-code prefix format', () => {
			const r = identityNumberSchema.safeParse('PE-123456')
			expect(r.success).toBe(true)
		})

		it('accepts letters followed by digits (no separator)', () => {
			const r = identityNumberSchema.safeParse('CE987654')
			expect(r.success).toBe(true)
		})

		it('accepts lowercase alphanumeric', () => {
			const r = identityNumberSchema.safeParse('ab1234')
			expect(r.success).toBe(true)
		})
	})

	describe('invalid inputs', () => {
		it('rejects empty string', () => {
			const r = identityNumberSchema.safeParse('')
			expect(r.success).toBe(false)
		})

		it('rejects string shorter than 5 characters', () => {
			const r = identityNumberSchema.safeParse('AB1')
			expect(r.success).toBe(false)
		})

		it('rejects string containing a space', () => {
			const r = identityNumberSchema.safeParse('12 345')
			expect(r.success).toBe(false)
		})

		it('rejects string containing @', () => {
			const r = identityNumberSchema.safeParse('abc@123')
			expect(r.success).toBe(false)
		})

		it('rejects string containing underscore', () => {
			const r = identityNumberSchema.safeParse('A_1234')
			expect(r.success).toBe(false)
		})
	})

	describe('length bounds', () => {
		it('rejects a 21-character string (over max)', () => {
			const r = identityNumberSchema.safeParse('A'.repeat(21))
			expect(r.success).toBe(false)
		})

		it('accepts a 20-character string (exactly max)', () => {
			const r = identityNumberSchema.safeParse('A'.repeat(20))
			expect(r.success).toBe(true)
		})

		it('accepts a 5-character string (exactly min)', () => {
			const r = identityNumberSchema.safeParse('AB123')
			expect(r.success).toBe(true)
		})

		it('rejects a 4-character string (below min)', () => {
			const r = identityNumberSchema.safeParse('AB12')
			expect(r.success).toBe(false)
		})
	})

	describe('server-side transform', () => {
		const upperSchema = identityNumberSchema.transform((v) => v.toUpperCase())

		it('transforms ce-123456 to CE-123456', () => {
			const r = upperSchema.safeParse('ce-123456')
			expect(r.success).toBe(true)
			if (r.success) {
				expect(r.data).toBe('CE-123456')
			}
		})

		it('transforms ab1234 to AB1234', () => {
			const r = upperSchema.safeParse('ab1234')
			expect(r.success).toBe(true)
			if (r.success) {
				expect(r.data).toBe('AB1234')
			}
		})
	})
})
