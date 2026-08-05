import { describe, it, expect, vi, afterEach } from 'vitest'
import { getDefaultLeadBoardFilters } from '@/features/leads/lib/lead-board-filters'
import { currentBogotaMonthRange } from '@/features/shared/lib/bogota-date-range'

describe('getDefaultLeadBoardFilters', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('defaults outcomeStatuses to [OPEN] and createdAtRange to the current Bogotá month', () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-08-04T15:00:00.000Z'))

		const filters = getDefaultLeadBoardFilters()
		const expectedRange = currentBogotaMonthRange()

		expect(filters.outcomeStatuses).toEqual(['OPEN'])
		expect(filters.createdAtRange.gte.getTime()).toBe(
			expectedRange.gte.getTime()
		)
		expect(filters.createdAtRange.lte.getTime()).toBe(
			expectedRange.lte.getTime()
		)
	})
})
