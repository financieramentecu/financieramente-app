import { describe, expect, it } from 'vitest'
import {
	DefaultDistributionUpdateError,
	fractionToPercent,
	percentToFraction,
	validateDefaultDistributionUpdate,
} from '@/features/distribution-commission/lib/default-distribution-update'

const current = [
	{ id: 1, configLevelCode: 'LEVEL_0', percentage: 60 },
	{ id: 2, configLevelCode: 'LEVEL_0', percentage: 8.5 },
]

describe('validateDefaultDistributionUpdate', () => {
	it('accepts a complete update within 100', () => {
		expect(() =>
			validateDefaultDistributionUpdate(current, [
				{ id: 1, percentage: 55 },
				{ id: 2, percentage: 10 },
			])
		).not.toThrow()
	})

	it('rejects a partial payload', () => {
		expect(() =>
			validateDefaultDistributionUpdate(current, [{ id: 1, percentage: 55 }])
		).toThrow(DefaultDistributionUpdateError)
	})

	it('rejects a level whose percentages exceed 100', () => {
		expect(() =>
			validateDefaultDistributionUpdate(current, [
				{ id: 1, percentage: 90 },
				{ id: 2, percentage: 20 },
			])
		).toThrow('La suma de LEVEL_0 no puede superar 100')
	})
})

describe('percent conversion', () => {
	it('stores 60 as 0.6 and 0.85 as 0.0085', () => {
		expect(percentToFraction(60)).toBe(0.6)
		expect(percentToFraction(0.85)).toBe(0.0085)
		expect(fractionToPercent(0.0085)).toBe(0.85)
	})
})
