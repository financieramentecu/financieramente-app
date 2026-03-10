import { describe, it, expect } from 'vitest'
import { createCommissionDiscountSchema } from '@/features/commission-discounts/lib/commission-discount-schemas'

describe('createCommissionDiscountSchema', () => {
	it('passes for valid input', () => {
		const result = createCommissionDiscountSchema.safeParse({
			name: 'Impuesto vigente',
			type: 'IMPUESTO',
			percentage: 12,
		})
		expect(result.success).toBe(true)
	})

	it('fails when percentage is below 0.01', () => {
		const result = createCommissionDiscountSchema.safeParse({
			name: 'Test',
			type: 'IMPUESTO',
			percentage: 0,
		})
		expect(result.success).toBe(false)
	})

	it('fails when percentage is above 100', () => {
		const result = createCommissionDiscountSchema.safeParse({
			name: 'Test',
			type: 'CLAWBACK',
			percentage: 101,
		})
		expect(result.success).toBe(false)
	})

	it('fails when name is missing', () => {
		const result = createCommissionDiscountSchema.safeParse({
			type: 'IMPUESTO',
			percentage: 10,
		})
		expect(result.success).toBe(false)
	})

	it('fails when type is invalid', () => {
		const result = createCommissionDiscountSchema.safeParse({
			name: 'Test',
			type: 'INVALID_TYPE',
			percentage: 10,
		})
		expect(result.success).toBe(false)
	})

	it('passes when description is omitted', () => {
		const result = createCommissionDiscountSchema.safeParse({
			name: 'Clawback operativo',
			type: 'CLAWBACK',
			percentage: 10,
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.description).toBeUndefined()
		}
	})
})
