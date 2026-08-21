import { describe, it, expect, vi, afterEach } from 'vitest'
import {
	parseBogotaInclusiveUtcRange,
	currentBogotaMonthRange,
	BOGOTA_TZ,
} from '@/features/shared/lib/bogota-date-range'

describe('parseBogotaInclusiveUtcRange', () => {
	it('produce un solo día inclusivo cuando from === to', () => {
		const { gte, lte } = parseBogotaInclusiveUtcRange(
			'2026-06-15',
			'2026-06-15'
		)
		expect(gte.getTime()).toBeLessThanOrEqual(lte.getTime())
		expect(lte.getTime() - gte.getTime()).toBeLessThan(24 * 60 * 60 * 1000)
	})

	it('rechaza from > to', () => {
		expect(() =>
			parseBogotaInclusiveUtcRange('2026-06-16', '2026-06-15')
		).toThrow()
	})

	it('usa zona Bogotá', () => {
		expect(BOGOTA_TZ).toBe('America/Bogota')
	})
})

describe('currentBogotaMonthRange', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('day 1 before 05:00 UTC still resolves to the previous Bogotá month', () => {
		vi.useFakeTimers()
		// 2026-08-01T04:00:00Z === 2026-07-31 23:00 in Bogotá (UTC-5)
		vi.setSystemTime(new Date('2026-08-01T04:00:00.000Z'))

		const result = currentBogotaMonthRange()
		const expected = parseBogotaInclusiveUtcRange('2026-07-01', '2026-07-31')

		expect(result.gte.getTime()).toBe(expected.gte.getTime())
		expect(result.lte.getTime()).toBe(expected.lte.getTime())
	})

	it('last day after 19:00 Bogotá (crossing UTC midnight) stays in the current Bogotá month', () => {
		vi.useFakeTimers()
		// 2026-07-01T00:30:00Z === 2026-06-30 19:30 in Bogotá (UTC-5)
		vi.setSystemTime(new Date('2026-07-01T00:30:00.000Z'))

		const result = currentBogotaMonthRange()
		const expected = parseBogotaInclusiveUtcRange('2026-06-01', '2026-06-30')

		expect(result.gte.getTime()).toBe(expected.gte.getTime())
		expect(result.lte.getTime()).toBe(expected.lte.getTime())
	})

	it('usa zona Bogotá', () => {
		expect(BOGOTA_TZ).toBe('America/Bogota')
	})
})
