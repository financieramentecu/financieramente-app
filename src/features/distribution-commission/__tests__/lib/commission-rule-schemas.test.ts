import { describe, it, expect } from 'vitest'
import {
	createCommissionRuleSchema,
	updateCommissionRuleSchema,
	categoryPercentageSchema,
} from '../../lib/commission-rule-schemas'

describe('Commission Rule Schemas', () => {
	describe('categoryPercentageSchema', () => {
		it('should validate valid category percentage', () => {
			const valid = { idCategory: 1, percentage: 15.5 }
			const result = categoryPercentageSchema.safeParse(valid)
			expect(result.success).toBe(true)
		})

		it('should reject percentage below 1', () => {
			const invalid = { idCategory: 1, percentage: 0 }
			const result = categoryPercentageSchema.safeParse(invalid)
			expect(result.success).toBe(false)
		})

		it('should fail if percentage is negative', () => {
			const invalid = { idCategory: 1, percentage: -1 }
			const result = categoryPercentageSchema.safeParse(invalid)
			expect(result.success).toBe(false)
		})

		it('should fail if percentage exceeds maximum', () => {
			const invalid = { idCategory: 1, percentage: 1000 }
			const result = categoryPercentageSchema.safeParse(invalid)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain(
					'El porcentaje no puede exceder 100'
				)
			}
		})

		it('should reject undefined percentage (RF-02 empty state)', () => {
			const result = categoryPercentageSchema.safeParse({
				idCategory: 1,
				percentage: undefined,
			})
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('número')
			}
		})

		it('should reject missing percentage key', () => {
			const result = categoryPercentageSchema.safeParse({ idCategory: 1 })
			expect(result.success).toBe(false)
		})
	})

	describe('createCommissionRuleSchema', () => {
		it('should validate valid payload', () => {
			const valid = {
				idProductConfiguration: 10,
				description: 'Valid Description',
				categories: [{ idCategory: 1, percentage: 100 }],
			}
			const result = createCommissionRuleSchema.safeParse(valid)
			expect(result.success).toBe(true)
		})

		it('should allow empty categories', () => {
			const valid = {
				idProductConfiguration: 10,
				description: '',
				categories: [],
			}
			const result = createCommissionRuleSchema.safeParse(valid)
			expect(result.success).toBe(true)
		})

		it('should fail on duplicate categories', () => {
			const invalid = {
				idProductConfiguration: 10,
				description: 'Duplicados',
				categories: [
					{ idCategory: 1, percentage: 10 },
					{ idCategory: 1, percentage: 20 },
				],
			}
			const result = createCommissionRuleSchema.safeParse(invalid)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Categoría duplicada')
			}
		})

		it('should fail when sum of percentages exceeds 100', () => {
			const invalid = {
				idProductConfiguration: 10,
				description: 'Suma inválida',
				categories: [
					{ idCategory: 1, percentage: 60 },
					{ idCategory: 2, percentage: 50 },
				],
			}
			const result = createCommissionRuleSchema.safeParse(invalid)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues.some((i) => i.message.includes('100'))).toBe(
					true
				)
			}
		})

		it('should accept categories summing to exactly 100', () => {
			const valid = {
				idProductConfiguration: 10,
				description: 'OK',
				categories: [
					{ idCategory: 1, percentage: 40 },
					{ idCategory: 2, percentage: 60 },
				],
			}
			expect(createCommissionRuleSchema.safeParse(valid).success).toBe(true)
		})

		it('should reject category line with undefined percentage', () => {
			const invalid = {
				idProductConfiguration: 10,
				description: 'X',
				categories: [{ idCategory: 1, percentage: undefined }],
			}
			expect(createCommissionRuleSchema.safeParse(invalid).success).toBe(false)
		})
	})

	describe('updateCommissionRuleSchema', () => {
		it('should validate partial update', () => {
			const valid = {
				idProductPercentageCommission: 5,
				active: false,
			}
			const result = updateCommissionRuleSchema.safeParse(valid)
			expect(result.success).toBe(true)
		})

		it('should validate full update', () => {
			const valid = {
				idProductPercentageCommission: 5,
				description: 'Updated Desc',
				active: true,
				categories: [
					{ idCategory: 1, percentage: 50 },
					{ idCategory: 2, percentage: 50 },
				],
			}
			const result = updateCommissionRuleSchema.safeParse(valid)
			expect(result.success).toBe(true)
		})
	})
})
