import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseBogotaInclusiveUtcRange } from '@/features/shared/lib/bogota-date-range'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import {
	buildAbaMfundInclusionWhere,
	buildAbaMfundWhere,
} from '../lib/build-aba-mfund-where'
import {
	COP_CURRENCY_ID,
	MFUND_EXCLUSION,
	type AbaMfundFilters,
} from '../types/aba-mfund.types'

function baseFilters(overrides: Partial<AbaMfundFilters> = {}): AbaMfundFilters {
	return {
		dateFrom: '2026-08-01',
		dateTo: '2026-08-31',
		userIds: [1, 2],
		statuses: [],
		...overrides,
	}
}

describe('buildAbaMfundInclusionWhere', () => {
	it('includes SKANDIA + MFUND on the product path (positive predicate)', () => {
		const where = buildAbaMfundInclusionWhere()
		expect(MFUND_EXCLUSION.COMPANY_NAME).toBe('SKANDIA')
		expect(MFUND_EXCLUSION.PRODUCT_NAME).toBe('MFUND')
		expect(where).toEqual({
			productPercentageCommission: {
				productConfiguration: {
					product: {
						name: 'MFUND',
						company: { name: 'SKANDIA' },
					},
				},
			},
		})
		expect(where).not.toHaveProperty('NOT')
	})
})

describe('buildAbaMfundWhere', () => {
	it('always ANDs inclusion and idCurrency = 1', () => {
		const where = buildAbaMfundWhere(baseFilters())
		expect(COP_CURRENCY_ID).toBe(1)
		expect(where.idUser).toEqual({ in: [1, 2] })
		expect(Array.isArray(where.AND)).toBe(true)
		const and = where.AND as unknown[]
		expect(and).toContainEqual(buildAbaMfundInclusionWhere())
		expect(and).toContainEqual({ idCurrency: 1 })
		const json = JSON.stringify(where)
		expect(json).toContain('SKANDIA')
		expect(json).toContain('MFUND')
	})

	it('uses Bogotá inclusive UTC range for createdAt (never raw YYYY-MM-DD Date)', () => {
		const filters = baseFilters()
		const where = buildAbaMfundWhere(filters)
		const expected = parseBogotaInclusiveUtcRange(filters.dateFrom, filters.dateTo)
		expect(where.createdAt).toEqual(expected)
		expect(where.createdAt).not.toEqual({
			gte: new Date('2026-08-01'),
			lte: new Date('2026-08-31'),
		})
	})

	it('omits status predicate when statuses is empty (includes CANCELADO)', () => {
		const where = buildAbaMfundWhere(baseFilters({ statuses: [] }))
		const json = JSON.stringify(where)
		expect(json).not.toContain('"status"')
		expect(json).not.toContain(BUSINESS_STATUS.CANCELADO)
	})

	it('applies status.in when statuses are selected', () => {
		const where = buildAbaMfundWhere(
			baseFilters({ statuses: [BUSINESS_STATUS.FONDEADO] })
		)
		const and = where.AND as unknown[]
		expect(and).toContainEqual({ status: { in: [BUSINESS_STATUS.FONDEADO] } })
	})
})

describe('ABA-MFUND never uses Producción Real MFUND exclusion', () => {
	function collectTestFiles(dir: string): string[] {
		const entries = readdirSync(dir)
		const files: string[] = []
		for (const entry of entries) {
			const full = join(dir, entry)
			if (statSync(full).isDirectory()) {
				files.push(...collectTestFiles(full))
				continue
			}
			if (/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
				files.push(full)
			}
		}
		return files
	}

	it('ABA-MFUND tests never import buildMfundExclusionWhere', () => {
		const here = dirname(fileURLToPath(import.meta.url))
		const featureTests = collectTestFiles(here)
		const apiTests = collectTestFiles(
			join(here, '../../../../app/api/reports/aba-mfund/__tests__')
		)
		const files = [...featureTests, ...apiTests]
		expect(files.length).toBeGreaterThan(0)

		for (const file of files) {
			const source = readFileSync(file, 'utf8')
			expect(source, file).not.toMatch(
				/from ['"][^'"]*build-produccion-real-where['"]/
			)
			expect(source, file).not.toMatch(
				/import\s*(?:type\s+)?(?:\{[^}]*|\*\s+as\s+\w+\s+from\s+)?['"][^'"]*buildMfundExclusionWhere/
			)
			expect(source, file).not.toMatch(
				/\bimport\s*\{[^}]*\bbuildMfundExclusionWhere\b/
			)
		}
	})
})
