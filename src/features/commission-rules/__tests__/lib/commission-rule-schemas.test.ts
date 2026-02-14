import { describe, it, expect } from 'vitest'
import {
	createCommissionRuleSchema,
	updateCommissionRuleSchema,
} from '../../lib/commission-rule-schemas'

describe('Commission Rule Schemas', () => {
	describe('createCommissionRuleSchema', () => {
		it('should validate a valid rule', () => {
			const input = {
				idProductConfiguration: 1,
				description: 'Test Rule',
				categories: [
					{ idCategory: 1, percentage: 15 },
					{ idCategory: 2, percentage: 0.5 },
				],
			}
			const result = createCommissionRuleSchema.safeParse(input)
			expect(result.success).toBe(true)
		})

		it('should fail if idProductConfiguration is missing', () => {
			const input = {
				description: 'Test Rule',
			}
			const result = createCommissionRuleSchema.safeParse(input)
			expect(result.success).toBe(false)
		})

		it('should fail if percentage is out of range', () => {
			const input = {
				idProductConfiguration: 1,
				categories: [{ idCategory: 1, percentage: 1000 }],
			}
			const result = createCommissionRuleSchema.safeParse(input)
			expect(result.success).toBe(false)
		})

		it('should fail if percentage is zero or negative', () => {
			const input = {
				idProductConfiguration: 1,
				categories: [{ idCategory: 1, percentage: 0 }],
			}
			const result = createCommissionRuleSchema.safeParse(input)
			expect(result.success).toBe(false)
		})
	})

	describe('updateCommissionRuleSchema', () => {
		it('should validate a valid update', () => {
			const input = {
				idProductPercentageCommission: 1,
				active: false,
			}
			const result = updateCommissionRuleSchema.safeParse(input)
			expect(result.success).toBe(true)
		})
	})
})
