import { describe, it, expect } from 'vitest'
import {
	businessFilterParamsSchema,
	negociosExportBodySchema,
} from '@/features/negocios/lib/business-api.schemas'
import { toBusinessListFilterInput } from '@/features/negocios/lib/to-business-list-filter-input'
import { buildBusinessListWhere } from '@/features/negocios/lib/build-business-list-where'
import { UserRole } from '@/features/auth/lib/roles'
import { countActiveDimensions } from '@/features/negocios/lib/count-active-dimensions'
import { getCurrentMonthRange } from '@/features/negocios/lib/default-date-filter'

const adminUser = { idUser: 1, role: { code: UserRole.ADMIN } }

/**
 * Integration test: filter applied in Sheet → URL params → export receives same params.
 * Tests the full pipeline from URL param parsing → WHERE clause.
 */
describe('filter-flow integration', () => {
	it('URL params written by AdvancedFiltersSheet produce same WHERE as export params', () => {
		// Simulate what AdvancedFiltersSheet writes to URL
		const urlParams = new URLSearchParams()
		urlParams.append('statuses', 'EMITIDO')
		urlParams.append('statuses', 'FONDEADO')
		urlParams.set('dateFrom', '2026-01-01')
		urlParams.set('dateTo', '2026-01-31')
		urlParams.set('hasSupports', 'true')
		urlParams.append('companyIds', '1')
		urlParams.append('terms', '2')
		urlParams.append('periodicityIds', '3')
		urlParams.append('novedadStatuses', 'PENDIENTE')
		urlParams.append('novedadStatuses', 'SIN_NOVEDAD')

		// Parse via list schema (simulating GET /api/negocios)
		const listParams = businessFilterParamsSchema.parse({
			statuses: urlParams.getAll('statuses'),
			dateFrom: urlParams.get('dateFrom'),
			dateTo: urlParams.get('dateTo'),
			hasSupports: urlParams.get('hasSupports'),
			companyIds: urlParams.getAll('companyIds').map(Number),
			terms: urlParams.getAll('terms').map(Number),
			periodicityIds: urlParams.getAll('periodicityIds').map(Number),
			novedadStatuses: urlParams.getAll('novedadStatuses'),
		})

		// Parse via export schema (simulating POST /api/negocios/export with same params)
		const exportParams = negociosExportBodySchema.parse({
			statuses: urlParams.getAll('statuses'),
			dateFrom: urlParams.get('dateFrom'),
			dateTo: urlParams.get('dateTo'),
			hasSupports: urlParams.get('hasSupports'),
			companyIds: urlParams.getAll('companyIds').map(Number),
			terms: urlParams.getAll('terms').map(Number),
			periodicityIds: urlParams.getAll('periodicityIds').map(Number),
			novedadStatuses: urlParams.getAll('novedadStatuses'),
		})

		const listFilterInput = toBusinessListFilterInput({
			statuses: listParams.statuses as string[],
			dateFrom: listParams.dateFrom,
			dateTo: listParams.dateTo,
			hasSupports: listParams.hasSupports,
			companyIds: listParams.companyIds,
			terms: listParams.terms,
			periodicityIds: listParams.periodicityIds,
			novedadStatuses: listParams.novedadStatuses,
		})

		const exportFilterInput = toBusinessListFilterInput({
			statuses: exportParams.statuses as string[],
			dateFrom: exportParams.dateFrom,
			dateTo: exportParams.dateTo,
			hasSupports: exportParams.hasSupports,
			companyIds: exportParams.companyIds,
			terms: exportParams.terms,
			periodicityIds: exportParams.periodicityIds,
			novedadStatuses: exportParams.novedadStatuses,
		})

		// Filter inputs must be identical
		expect(exportFilterInput).toEqual(listFilterInput)

		// WHERE clauses must be identical
		expect(buildBusinessListWhere(adminUser, exportFilterInput)).toEqual(
			buildBusinessListWhere(adminUser, listFilterInput)
		)
	})

	it('badge count correctly reflects active dimensions from URL', () => {
		const params = new URLSearchParams()
		params.append('statuses', 'EMITIDO')
		params.append('statuses', 'FONDEADO')
		params.set('dateFrom', '2026-01-01')
		params.set('dateTo', '2026-01-31')
		params.set('hasSupports', 'true')
		params.append('novedadStatuses', 'PENDIENTE')

		const count = countActiveDimensions(params)
		// statuses=1, date range=1, hasSupports=1, novedadStatuses=1
		expect(count).toBe(4)
	})

	it('empty URL params produce zero active dimensions', () => {
		const params = new URLSearchParams()
		expect(countActiveDimensions(params)).toBe(0)
	})

	it('only date range counts as 1 dimension regardless of date pair type', () => {
		const params1 = new URLSearchParams()
		params1.set('dateFrom', '2026-01-01')
		params1.set('dateTo', '2026-01-31')

		const params2 = new URLSearchParams()
		params2.set('dateIssuedFrom', '2026-01-01')
		params2.set('dateIssuedTo', '2026-01-31')

		expect(countActiveDimensions(params1)).toBe(1)
		expect(countActiveDimensions(params2)).toBe(1)
	})

	it('createdFrom+createdTo matching current month default does NOT count (no badge on initial load)', () => {
		const { from, to } = getCurrentMonthRange()
		const params = new URLSearchParams()
		params.set('createdFrom', from)
		params.set('createdTo', to)

		expect(countActiveDimensions(params)).toBe(0)
	})

	it('createdFrom+createdTo with non-default dates counts as 1 active dimension', () => {
		const params = new URLSearchParams()
		params.set('createdFrom', '2025-01-01')
		params.set('createdTo', '2025-01-31')

		expect(countActiveDimensions(params)).toBe(1)
	})
})
