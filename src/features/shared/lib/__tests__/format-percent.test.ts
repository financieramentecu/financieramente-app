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
		it('omits trailing fractional zeros (integers show without decimals)', () => {
			expect(formatPercentDisplay(10, LOCALE)).toBe('10%')
			expect(formatPercentDisplay(20, LOCALE)).toBe('20%')
		})

		it('shows decimals only when needed', () => {
			expect(formatPercentDisplay(10.5, LOCALE)).toMatch(/10[,.]5%/)
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

		it('matches formatPercentDisplay for the same semantic 0–100 value (shared rules)', () => {
			const cases = [0, 1, 10.25, 15.555555]
			for (const pct of cases) {
				const fromFraction = formatPercentFromFraction(pct / 100, LOCALE)
				const direct = formatPercentDisplay(pct, LOCALE)
				expect(fromFraction).toBe(direct)
			}
		})
	})

	describe('read-only presentation (0–100 from API)', () => {
		it('appends trailing % outside digit grouping', () => {
			const s = formatPercentDisplay(12.3, LOCALE)
			expect(s.endsWith('%')).toBe(true)
			expect(s.slice(0, -1)).not.toContain('%')
		})
	})
})
