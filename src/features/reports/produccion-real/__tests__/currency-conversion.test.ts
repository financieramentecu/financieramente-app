import { describe, expect, it } from 'vitest'
import {
	convertBusinessValue,
	convertCurrencySplit,
	consolidatedUsdFromSplit,
	displayCurrencyForMode,
} from '../lib/currency-conversion'
import {
	CURRENCY_MODE,
	DISPLAY_CURRENCY,
} from '../types/produccion-real.types'

describe('convertCurrencySplit', () => {
	const split = { totalCop: 4000, totalForeignUsd: 100 }

	it('ALL_TRM converts COP via TRM and adds foreign USD', () => {
		const result = convertCurrencySplit(split, CURRENCY_MODE.ALL_TRM, 4000)
		expect(result.displayCurrencyCode).toBe(DISPLAY_CURRENCY.USD)
		expect(result.amount).toBe(101)
	})

	it('ALL_TRM with missing TRM zeroes COP portion', () => {
		const result = convertCurrencySplit(split, CURRENCY_MODE.ALL_TRM, null)
		expect(result.amount).toBe(100)
	})

	it('FOREIGN returns only foreign totals', () => {
		const result = convertCurrencySplit(split, CURRENCY_MODE.FOREIGN, 4000)
		expect(result.displayCurrencyCode).toBe(DISPLAY_CURRENCY.FOREIGN)
		expect(result.amount).toBe(100)
	})

	it('COP returns only COP totals without TRM', () => {
		const result = convertCurrencySplit(split, CURRENCY_MODE.COP, 4000)
		expect(result.displayCurrencyCode).toBe(DISPLAY_CURRENCY.COP)
		expect(result.amount).toBe(4000)
	})
})

describe('convertBusinessValue', () => {
	it('converts COP to USD in ALL_TRM', () => {
		expect(convertBusinessValue(8000, 1, CURRENCY_MODE.ALL_TRM, 4000)).toBe(2)
	})

	it('keeps foreign as-is in ALL_TRM', () => {
		expect(convertBusinessValue(50, 2, CURRENCY_MODE.ALL_TRM, 4000)).toBe(50)
	})

	it('FOREIGN zeroes COP rows', () => {
		expect(convertBusinessValue(100, 1, CURRENCY_MODE.FOREIGN, null)).toBe(0)
	})

	it('COP zeroes foreign rows', () => {
		expect(convertBusinessValue(100, 2, CURRENCY_MODE.COP, null)).toBe(0)
	})
})

describe('displayCurrencyForMode', () => {
	it('maps modes to display codes', () => {
		expect(displayCurrencyForMode(CURRENCY_MODE.ALL_TRM)).toBe('USD')
		expect(displayCurrencyForMode(CURRENCY_MODE.FOREIGN)).toBe('FOREIGN')
		expect(displayCurrencyForMode(CURRENCY_MODE.COP)).toBe('COP')
	})
})

describe('consolidatedUsdFromSplit', () => {
	const split = { totalCop: 4000, totalForeignUsd: 100 }

	it('adds COP/TRM to foreign USD', () => {
		expect(consolidatedUsdFromSplit(split, 4000)).toBe(101)
	})

	it('zeroes the COP portion when TRM is missing', () => {
		expect(consolidatedUsdFromSplit(split, null)).toBe(100)
	})
})
