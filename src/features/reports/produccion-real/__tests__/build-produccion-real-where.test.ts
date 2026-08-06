import { describe, expect, it } from 'vitest'
import {
	buildMfundExclusionWhere,
	buildProduccionRealWhere,
	buildRegularKpiWhere,
	buildUnicoKpiWhere,
	buildUnicoSecondPlusExclusionWhere,
} from '../lib/build-produccion-real-where'
import {
	CONTRIBUTION_TYPE,
	CURRENCY_MODE,
	MFUND_EXCLUSION,
	SECOND_PLUS_ANNUALIDAD_MIN_INDEX,
	type ProduccionRealFilters,
} from '../types/produccion-real.types'

function baseFilters(
	overrides: Partial<ProduccionRealFilters> = {}
): ProduccionRealFilters {
	return {
		dateFrom: '2026-08-01',
		dateTo: '2026-08-31',
		contributionTypes: [],
		companyIds: [],
		currencyMode: CURRENCY_MODE.ALL_TRM,
		userIds: [1, 2],
		...overrides,
	}
}

describe('buildMfundExclusionWhere', () => {
	it('excludes SKANDIA + MFUND product path', () => {
		const where = buildMfundExclusionWhere()
		expect(where).toEqual({
			NOT: {
				productPercentageCommission: {
					productConfiguration: {
						product: {
							name: MFUND_EXCLUSION.PRODUCT_NAME,
							company: { name: MFUND_EXCLUSION.COMPANY_NAME },
						},
					},
				},
			},
		})
	})
})

describe('buildProduccionRealWhere', () => {
	it('always includes MFUND exclusion in AND', () => {
		const where = buildProduccionRealWhere(baseFilters())
		expect(where.idUser).toEqual({ in: [1, 2] })
		expect(where.createdAt).toBeDefined()
		expect(Array.isArray(where.AND)).toBe(true)
		const and = where.AND as unknown[]
		expect(and).toContainEqual(buildMfundExclusionWhere())
	})

	it('filters COP currency mode', () => {
		const where = buildProduccionRealWhere(
			baseFilters({ currencyMode: CURRENCY_MODE.COP })
		)
		const and = where.AND as Array<Record<string, unknown>>
		expect(and.some((c) => c.idCurrency === 1)).toBe(true)
	})

	it('filters FOREIGN currency mode as NOT COP', () => {
		const where = buildProduccionRealWhere(
			baseFilters({ currencyMode: CURRENCY_MODE.FOREIGN })
		)
		const and = where.AND as Array<Record<string, unknown>>
		expect(and.some((c) => {
			const not = c.NOT as { idCurrency?: number } | undefined
			return not?.idCurrency === 1
		})).toBe(true)
	})

	it('applies company and contribution filters when provided', () => {
		const where = buildProduccionRealWhere(
			baseFilters({
				companyIds: [10],
				contributionTypes: [CONTRIBUTION_TYPE.REGULAR],
			})
		)
		const and = where.AND as unknown[]
		expect(and.length).toBeGreaterThanOrEqual(3)
	})

	it('keeps MFUND exclusion even when SKANDIA company is selected', () => {
		const where = buildProduccionRealWhere(
			baseFilters({ companyIds: [99] })
		)
		const and = where.AND as unknown[]
		expect(and).toContainEqual(buildMfundExclusionWhere())
	})
})

describe('buildUnicoKpiWhere', () => {
	it('requires UNICO contribution and installmentIndex >= 2 exclusion', () => {
		const where = buildUnicoKpiWhere(baseFilters())
		const and = where.AND as unknown[]
		expect(and).toContainEqual(buildUnicoSecondPlusExclusionWhere())
		expect(SECOND_PLUS_ANNUALIDAD_MIN_INDEX).toBe(2)
		expect(buildUnicoSecondPlusExclusionWhere()).toEqual({
			NOT: {
				payments: {
					some: {
						installmentIndex: { gte: 2 },
					},
				},
			},
		})
		const json = JSON.stringify(where)
		expect(json).toContain('UNICO')
	})
})

describe('buildRegularKpiWhere', () => {
	it('narrows to REGULAR contribution type', () => {
		const where = buildRegularKpiWhere(baseFilters())
		const json = JSON.stringify(where)
		expect(json).toContain('REGULAR')
	})
})
