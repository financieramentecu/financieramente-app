import { describe, it, expect } from 'vitest'
import {
	businessFilterParamsSchema,
	businessListParamsSchema,
	negociosExportBodySchema,
} from '@/features/negocios/lib/business-api.schemas'

/**
 * Parity test: the same filter input through businessFilterParamsSchema
 * must produce identical output whether used for list or export.
 * Both businessListParamsSchema and negociosExportBodySchema must share
 * the same core filter fields.
 */
describe('businessFilterParamsSchema — schema parity (tasks 2.1)', () => {
	it('same filter input produces identical output for list and export schemas', () => {
		const filterInput = {
			search: 'test',
			status: 'EMITIDO',
			statuses: ['EMITIDO', 'FONDEADO'],
			dateFrom: '2026-01-01',
			dateTo: '2026-01-31',
			createdFrom: '2026-01-01',
			createdTo: '2026-01-31',
			dateIssuedFrom: '2026-01-01',
			dateIssuedTo: '2026-01-31',
			agentName: 'Juan',
			hasSupports: true,
			terms: [1, 2, 3],
			periodicityIds: [1, 2],
			companyIds: [10, 20],
			productIds: [5],
			originIds: [3],
		}

		const fromFilter = businessFilterParamsSchema.parse(filterInput)
		const fromList = businessListParamsSchema.parse({ ...filterInput, page: '1', pageSize: '10' })
		const fromExport = negociosExportBodySchema.parse(filterInput)

		// All filter fields should be equal between list and export
		const listFilters = businessFilterParamsSchema.parse(fromList)
		expect(listFilters).toEqual(fromFilter)
		expect(fromExport).toEqual(fromFilter)
	})

	it('export schema includes all new filter params', () => {
		const exportInput = {
			statuses: ['EMITIDO'],
			dateIssuedFrom: '2026-01-01',
			dateIssuedTo: '2026-01-31',
			hasSupports: false,
			terms: [2],
			periodicityIds: [3],
			novedadStatuses: ['PENDIENTE', 'SIN_NOVEDAD'],
		}

		const result = negociosExportBodySchema.parse(exportInput)

		expect(result.statuses).toEqual(['EMITIDO'])
		expect(result.dateIssuedFrom).toBe('2026-01-01')
		expect(result.dateIssuedTo).toBe('2026-01-31')
		expect(result.hasSupports).toBe(false)
		expect(result.terms).toEqual([2])
		expect(result.periodicityIds).toEqual([3])
		expect(result.novedadStatuses).toEqual(['PENDIENTE', 'SIN_NOVEDAD'])
	})

	it('rejects invalid novedadStatuses values', () => {
		const result = businessFilterParamsSchema.safeParse({
			novedadStatuses: ['RESUELTA'],
		})
		expect(result.success).toBe(false)
	})

	it('list schema includes page/sort fields on top of filter fields', () => {
		const result = businessListParamsSchema.parse({
			page: '2',
			pageSize: '20',
			sortBy: 'createdAt',
			sortOrder: 'asc',
		})

		expect(result.page).toBe(2)
		expect(result.pageSize).toBe(20)
		expect(result.sortBy).toBe('createdAt')
		expect(result.sortOrder).toBe('asc')
	})
})
