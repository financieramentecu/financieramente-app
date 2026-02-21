import { describe, it, expect } from 'vitest'
import { cleanNumericValue, toDecimal } from '../number-utils'

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

describe('toDecimal', () => {
	it('returns decimal string for valid values', () => {
		expect(toDecimal('1.234,00')).toBe('1234')
	})

	it('returns 0 for invalid values', () => {
		expect(toDecimal('invalid')).toBe('0')
	})
})
