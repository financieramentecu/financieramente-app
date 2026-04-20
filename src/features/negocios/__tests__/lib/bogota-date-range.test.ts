import { describe, it, expect } from 'vitest'
import {
	parseBogotaInclusiveUtcRange,
	BOGOTA_TZ,
} from '@/features/negocios/lib/bogota-date-range'

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
