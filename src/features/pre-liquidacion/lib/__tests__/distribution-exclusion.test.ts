import { describe, it, expect } from 'vitest'
import {
	EXCLUDED_SETTLEMENT_STATUS,
	isBusinessDistributionExcluded,
} from '../distribution-exclusion'

const withLevel = (code: string | null | undefined) => ({
	productPercentageCommission: { productConfiguration: { level: { code } } },
})

describe('isBusinessDistributionExcluded', () => {
	it('is true for PARTNER_EXTERNAL', () => {
		expect(isBusinessDistributionExcluded(withLevel('PARTNER_EXTERNAL'))).toBe(
			true
		)
	})

	it.each([
		'LEVEL_0',
		'LEVEL_5',
		'GENERAL_LEVEL',
		'partner_external',
		'',
		null,
		undefined,
	])('is false for level %s', (code) => {
		expect(isBusinessDistributionExcluded(withLevel(code))).toBe(false)
	})

	it.each([
		null,
		undefined,
		{},
		{ productPercentageCommission: null },
		{ productPercentageCommission: {} },
		{ productPercentageCommission: { productConfiguration: null } },
		{ productPercentageCommission: { productConfiguration: { level: null } } },
	])('is false when the relation chain is incomplete (%j)', (business) => {
		expect(isBusinessDistributionExcluded(business as never)).toBe(false)
	})

	it('exposes the status literal', () => {
		expect(EXCLUDED_SETTLEMENT_STATUS).toBe('EXCLUDED')
	})
})
