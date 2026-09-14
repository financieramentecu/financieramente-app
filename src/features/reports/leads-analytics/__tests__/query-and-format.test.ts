import { describe, expect, it } from 'vitest'
import {
	leadsAnalyticsCellQuerySchema,
	leadsAnalyticsQuerySchema,
} from '../lib/leads-analytics-schemas'
import { CELL_OWNER_SENTINEL } from '../lib/cell-owner-filter'
import { currentBogotaMonthDateStrings } from '../lib/filter-date'
import { formatOwnerName } from '../lib/format-owner-name'

describe('leadsAnalyticsQuerySchema', () => {
	it('accepts an inclusive YYYY-MM-DD range and parses userIds', () => {
		const parsed = leadsAnalyticsQuerySchema.parse({
			dateFrom: '2026-08-01',
			dateTo: '2026-08-31',
			userIds: '10,11',
		})
		expect(parsed).toEqual({
			dateFrom: '2026-08-01',
			dateTo: '2026-08-31',
			userIds: [10, 11],
		})
	})

	it('defaults missing userIds to an empty list', () => {
		const parsed = leadsAnalyticsQuerySchema.parse({
			dateFrom: '2026-08-01',
			dateTo: '2026-08-31',
		})
		expect(parsed.userIds).toEqual([])
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

describe('leadsAnalyticsCellQuerySchema', () => {
	it('treats omitted idUser as all selected owners', () => {
		const parsed = leadsAnalyticsCellQuerySchema.parse({
			dateFrom: '2026-08-01',
			dateTo: '2026-08-31',
			userIds: '10',
			idLeadFunnelColumn: '3',
		})
		expect(parsed.ownerFilter).toBe(CELL_OWNER_SENTINEL.ALL)
		expect(parsed.idLeadFunnelColumn).toBe(3)
	})

	it('maps idUser=none to unassigned and a number to one owner', () => {
		expect(
			leadsAnalyticsCellQuerySchema.parse({
				dateFrom: '2026-08-01',
				dateTo: '2026-08-31',
				idLeadFunnelColumn: '1',
				idUser: 'none',
			}).ownerFilter
		).toBe(CELL_OWNER_SENTINEL.UNASSIGNED)

		expect(
			leadsAnalyticsCellQuerySchema.parse({
				dateFrom: '2026-08-01',
				dateTo: '2026-08-31',
				idLeadFunnelColumn: '1',
				idUser: '12',
			}).ownerFilter
		).toBe(12)
	})
})

describe('formatOwnerName', () => {
	it('joins name and last name', () => {
		expect(formatOwnerName({ name: 'Ana', lastName: 'Pérez' })).toBe('Ana Pérez')
		expect(formatOwnerName({ name: 'Luis', lastName: null })).toBe('Luis')
	})
})
