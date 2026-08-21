import { describe, expect, it } from 'vitest'
import { leadsAnalyticsQuerySchema } from '../lib/leads-analytics-schemas'
import { currentBogotaMonthDateStrings } from '../lib/filter-date'
import { formatOwnerName } from '../lib/format-owner-name'

describe('leadsAnalyticsQuerySchema', () => {
	it('accepts an inclusive YYYY-MM-DD range', () => {
		const parsed = leadsAnalyticsQuerySchema.parse({
			dateFrom: '2026-08-01',
			dateTo: '2026-08-31',
		})
		expect(parsed).toEqual({
			dateFrom: '2026-08-01',
			dateTo: '2026-08-31',
		})
	})

	it('rejects inverted ranges', () => {
		const parsed = leadsAnalyticsQuerySchema.safeParse({
			dateFrom: '2026-08-31',
			dateTo: '2026-08-01',
		})
		expect(parsed.success).toBe(false)
	})
})

describe('currentBogotaMonthDateStrings', () => {
	it('returns the Bogotá calendar month bounds', () => {
		const range = currentBogotaMonthDateStrings(
			new Date('2026-08-15T15:00:00.000Z')
		)
		expect(range.dateFrom).toBe('2026-08-01')
		expect(range.dateTo).toBe('2026-08-31')
	})
})

describe('formatOwnerName', () => {
	it('joins name and last name', () => {
		expect(formatOwnerName({ name: 'Ana', lastName: 'Pérez' })).toBe('Ana Pérez')
		expect(formatOwnerName({ name: 'Luis', lastName: null })).toBe('Luis')
	})
})
