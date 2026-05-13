import { describe, it, expect } from 'vitest'
import {
	parseCommissionPercentage,
	normalizeContributionType,
} from '../../lib/commission-seed-utils'

describe('commission-seed-utils', () => {
	describe('parseCommissionPercentage', () => {
		it('should parse "76.50%" to 76.5', () => {
			expect(parseCommissionPercentage('76.50%')).toBe(76.5)
		})

		it('should parse "12.5%" to 12.5 (triangulation — different value)', () => {
			expect(parseCommissionPercentage('12.5%')).toBe(12.5)
		})

		it('should parse value without percent symbol', () => {
			expect(parseCommissionPercentage('3.5')).toBe(3.5)
		})

		it('should return 0 for empty string', () => {
			expect(parseCommissionPercentage('')).toBe(0)
		})

		it('should return 0 for non-numeric string', () => {
			expect(parseCommissionPercentage('abc%')).toBe(0)
		})

		it('should handle "100%" as 100 (boundary — not dividing by 100)', () => {
			expect(parseCommissionPercentage('100%')).toBe(100)
		})
	})

	describe('normalizeContributionType', () => {
		it('should map "REGULAR" to "REGULAR"', () => {
			expect(normalizeContributionType('REGULAR')).toBe('REGULAR')
		})

		it('should map "UNICO" to "UNICO" (triangulation — different input)', () => {
			expect(normalizeContributionType('UNICO')).toBe('UNICO')
		})

		it('should handle lowercase input', () => {
			expect(normalizeContributionType('regular')).toBe('REGULAR')
		})

		it('should handle "unico" lowercase to "UNICO"', () => {
			expect(normalizeContributionType('unico')).toBe('UNICO')
		})

		it('should map any non-UNICO value to "REGULAR"', () => {
			expect(normalizeContributionType('OTRO')).toBe('REGULAR')
		})
	})
})
