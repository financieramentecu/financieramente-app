import { describe, it, expect } from 'vitest'
import {
	formatPercentDisplay,
	parsePercentPaste,
	normalizePercentPaste,
	formatPercentFromFraction,
} from '@/features/shared/lib/format-percent'

const LOCALE = 'es-CO'

describe('format-percent', () => {
	describe('parsePercentPaste', () => {
		it('parses 12,5 % with es-CO', () => {
			expect(parsePercentPaste('12,5 %', LOCALE)).toBe(12.5)
		})

		it('parses 12.5% when locale uses dot decimal', () => {
			expect(parsePercentPaste('12.5%', 'en-US')).toBe(12.5)
		})

		it('returns null for empty', () => {
			expect(parsePercentPaste('', LOCALE)).toBeNull()
		})

		it('returns null for invalid', () => {
			expect(parsePercentPaste('abc', LOCALE)).toBeNull()
		})
	})

	describe('normalizePercentPaste', () => {
		it('returns normalized string for valid paste', () => {
			const out = normalizePercentPaste('12,5 %', LOCALE)
			expect(out).toContain('12')
			expect(out).toContain('5')
		})
	})

	describe('formatPercentDisplay', () => {
		it('pads integer to four fractional digits', () => {
			expect(formatPercentDisplay(10, LOCALE)).toMatch(/10[,.]0000%/)
		})

		it('preserves fractional values with up to six decimals', () => {
			const s = formatPercentDisplay(15.555555, LOCALE)
			expect(s.endsWith('%')).toBe(true)
			expect(s).toContain('15')
		})
	})

	describe('formatPercentFromFraction', () => {
		it('multiplies fraction by 100 for display', () => {
			expect(formatPercentFromFraction(0.155, LOCALE)).toMatch(/15[,.]5/)
		})
	})
})
