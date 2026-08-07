import { describe, expect, it } from 'vitest'
import { computeConversionPercent } from '../services/produccion-real-kpi.service'
import {
	buildDefaultProduccionRealFilters,
	currentBogotaMonthDateStrings,
} from '../lib/default-filters'
import { CURRENCY_MODE } from '../types/produccion-real.types'
import {
	decodeDetailCursor,
	encodeDetailCursor,
	produccionRealQuerySchema,
} from '../lib/produccion-real-schemas'

describe('computeConversionPercent', () => {
	it('returns Fondeado / Producción Real * 100', () => {
		expect(computeConversionPercent(250, 1000)).toBe(25)
	})

	it('returns 0 when Producción Real is zero', () => {
		expect(computeConversionPercent(250, 0)).toBe(0)
	})
})

describe('buildDefaultProduccionRealFilters', () => {
	it('defaults to ALL_TRM and empty multi-selects (Todas)', () => {
		const defaults = buildDefaultProduccionRealFilters(
			new Date('2026-08-15T15:00:00.000Z')
		)
		expect(defaults.currencyMode).toBe(CURRENCY_MODE.ALL_TRM)
		expect(defaults.contributionTypes).toEqual([])
		expect(defaults.companyIds).toEqual([])
		const month = currentBogotaMonthDateStrings(
			new Date('2026-08-15T15:00:00.000Z')
		)
		expect(defaults.dateFrom).toBe(month.dateFrom)
		expect(defaults.dateTo).toBe(month.dateTo)
	})
})

describe('produccionRealQuerySchema', () => {
	it('parses empty userIds and optional filters', () => {
		const parsed = produccionRealQuerySchema.parse({
			dateFrom: '2026-08-01',
			dateTo: '2026-08-31',
		})
		expect(parsed.userIds).toEqual([])
		expect(parsed.contributionTypes).toEqual([])
		expect(parsed.companyIds).toEqual([])
		expect(parsed.currencyMode).toBe(CURRENCY_MODE.ALL_TRM)
		expect(parsed.limit).toBe(50)
	})

	it('parses comma-separated ids and contribution types', () => {
		const parsed = produccionRealQuerySchema.parse({
			dateFrom: '2026-08-01',
			dateTo: '2026-08-31',
			userIds: '1,2,3',
			companyIds: '10,20',
			contributionTypes: 'REGULAR,UNICO',
			currencyMode: 'FOREIGN',
			trmRate: '4200.5',
		})
		expect(parsed.userIds).toEqual([1, 2, 3])
		expect(parsed.companyIds).toEqual([10, 20])
		expect(parsed.contributionTypes).toEqual(['REGULAR', 'UNICO'])
		expect(parsed.currencyMode).toBe('FOREIGN')
		expect(parsed.trmRate).toBe(4200.5)
	})

	it('round-trips detail cursor encoding', () => {
		const cursor = {
			createdAt: '2026-08-05T12:00:00.000Z',
			idBusiness: 42,
		}
		const encoded = encodeDetailCursor(cursor)
		expect(decodeDetailCursor(encoded)).toEqual(cursor)
	})
})
