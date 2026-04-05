import { describe, it, expect } from 'vitest'
import {
	cleanLoadFileMoneyValue,
	cleanNumericValue,
	toDecimal,
	toDecimalFromLoadFileMoney,
} from '@/features/load-file/lib/number-utils'

describe('cleanNumericValue', () => {
	it('parses currency with thousands and comma decimal', () => {
		expect(cleanNumericValue('$ 1.234,56')).toBe(1234.56)
	})

	it('parses negative values with parentheses', () => {
		expect(cleanNumericValue('(1.713.600,00)')).toBe(-1713600)
	})

	it('parses negative values with minus sign', () => {
		expect(cleanNumericValue('-$ 1.713.600')).toBe(-1713600)
	})

	it('parses values with multiple thousand separators', () => {
		expect(cleanNumericValue('1.234.567')).toBe(1234567)
	})

	it('parses comma as decimal when dot is absent', () => {
		expect(cleanNumericValue('1,234')).toBe(1.234)
	})

	it('returns null for invalid numeric values', () => {
		expect(cleanNumericValue('abc')).toBeNull()
	})
})

describe('cleanLoadFileMoneyValue', () => {
	it('returns positive magnitude for negative Excel-style number', () => {
		expect(cleanLoadFileMoneyValue(-1_848_000)).toBe(1_848_000)
	})

	it('parses US accounting string with currency and parentheses', () => {
		expect(cleanLoadFileMoneyValue('$ (1,848,000.00)')).toBe(1_848_000)
	})

	it('parses European positive amount', () => {
		expect(cleanLoadFileMoneyValue('$ 1.234,56')).toBe(1234.56)
	})

	it('returns positive magnitude for EU amount in parentheses', () => {
		expect(cleanLoadFileMoneyValue('(1.713.600,00)')).toBe(1_713_600)
	})

	it('returns null for invalid values', () => {
		expect(cleanLoadFileMoneyValue('abc')).toBeNull()
	})
})

describe('toDecimalFromLoadFileMoney', () => {
	it('returns string for valid load-file money', () => {
		expect(toDecimalFromLoadFileMoney(-100)).toBe('100')
	})

	it('returns 0 for invalid values', () => {
		expect(toDecimalFromLoadFileMoney('invalid')).toBe('0')
	})
})

describe('toDecimal', () => {
	it('returns decimal string for valid values', () => {
		expect(toDecimal('1.234,00')).toBe('1234')
	})

	it('returns 0 for invalid values', () => {
		expect(toDecimal('invalid')).toBe('0')
	})
})
