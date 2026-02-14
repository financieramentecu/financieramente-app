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

		it('should fail if percentage is negative', () => {
			const invalid = { idCategory: 1, percentage: -1 }
			const result = categoryPercentageSchema.safeParse(invalid)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('no puede ser negativo')
			}
		})

		it('should fail if percentage exceeds 100', () => {
			const invalid = { idCategory: 1, percentage: 101 }
			const result = categoryPercentageSchema.safeParse(invalid)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('no puede exceder 100%')
			}
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

		it('should fail if description is too short', () => {
			const invalid = {
				idProductConfiguration: 10,
				description: 'ab',
				categories: [{ idCategory: 1, percentage: 100 }],
			}
			const result = createCommissionRuleSchema.safeParse(invalid)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('al menos 3 caracteres')
			}
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
				categories: [{ idCategory: 1, percentage: 50 }, { idCategory: 2, percentage: 50 }],
			}
			const result = updateCommissionRuleSchema.safeParse(valid)
			expect(result.success).toBe(true)
		})
	})
})
