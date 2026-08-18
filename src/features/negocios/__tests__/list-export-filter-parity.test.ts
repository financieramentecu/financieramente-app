import { describe, it, expect } from 'vitest'
import {
	businessFilterParamsSchema,
	businessListParamsSchema,
	negociosExportBodySchema,
} from '@/features/negocios/lib/business-api.schemas'
import { buildBusinessListWhere } from '@/features/negocios/lib/build-business-list-where'
import { toBusinessListFilterInput } from '@/features/negocios/lib/to-business-list-filter-input'
import { UserRole } from '@/features/auth/lib/roles'

const adminUser = { idUser: 1, role: { code: UserRole.ADMIN } }

describe('lista GET vs export POST — paridad de filtros (tasks 5.5)', () => {
	it('mismos search, status y rango de fechas → mismo BusinessListFilterInput y mismo Prisma where', () => {
		const listParsed = businessListParamsSchema.parse({
			page: '1',
			pageSize: '10',
			search: 'PN0001',
			status: 'EMITIDO',
			dateFrom: '2026-04-01',
			dateTo: '2026-04-30',
		})
		const exportParsed = negociosExportBodySchema.parse({
			search: 'PN0001',
			status: 'EMITIDO',
			dateFrom: '2026-04-01',
			dateTo: '2026-04-30',
		})

		const filtersList = toBusinessListFilterInput({
			search: listParsed.search,
			status: listParsed.status,
			dateFrom: listParsed.dateFrom,
			dateTo: listParsed.dateTo,
		})
		const filtersExport = toBusinessListFilterInput({
			search: exportParsed.search,
			status: exportParsed.status,
			dateFrom: exportParsed.dateFrom,
			dateTo: exportParsed.dateTo,
		})

		expect(filtersExport).toEqual(filtersList)
		expect(buildBusinessListWhere(adminUser, filtersList)).toEqual(
			buildBusinessListWhere(adminUser, filtersExport)
		)
	})

	it('sin fechas ni búsqueda: lista y export vacío equivalentes', () => {
		const listParsed = businessListParamsSchema.parse({
			page: '2',
			pageSize: '20',
		})
		const exportParsed = negociosExportBodySchema.parse({})

		const filtersList = toBusinessListFilterInput({
			search: listParsed.search,
			status: listParsed.status,
			dateFrom: listParsed.dateFrom,
			dateTo: listParsed.dateTo,
		})
		const filtersExport = toBusinessListFilterInput({
			search: exportParsed.search,
			status: exportParsed.status,
			dateFrom: exportParsed.dateFrom,
			dateTo: exportParsed.dateTo,
		})

		expect(filtersExport).toEqual(filtersList)
		expect(buildBusinessListWhere(adminUser, filtersList)).toEqual(
			buildBusinessListWhere(adminUser, filtersExport)
		)
	})

	it('solo estado: coincide entre ambos canales', () => {
		const listParsed = businessListParamsSchema.parse({
			page: '1',
			status: 'FONDEADO',
		})
		const exportParsed = negociosExportBodySchema.parse({
			status: 'FONDEADO',
		})

		const filtersList = toBusinessListFilterInput({
			search: listParsed.search,
			status: listParsed.status,
			dateFrom: listParsed.dateFrom,
			dateTo: listParsed.dateTo,
		})
		const filtersExport = toBusinessListFilterInput({
			search: exportParsed.search,
			status: exportParsed.status,
			dateFrom: exportParsed.dateFrom,
			dateTo: exportParsed.dateTo,
		})

		expect(filtersExport).toEqual(filtersList)
	})

	it('every param in businessFilterParamsSchema is handled by both route parsers identically (extended parity)', () => {
		// All new params from businessFilterParamsSchema must produce identical filter objects
		const allParams = {
			search: 'test',
			status: 'EMITIDO' as const,
			statuses: ['EMITIDO', 'FONDEADO'] as const,
			dateFrom: '2026-01-01',
			dateTo: '2026-01-31',
			createdFrom: '2026-01-01',
			createdTo: '2026-01-31',
			dateIssuedFrom: '2026-01-01',
			dateIssuedTo: '2026-01-31',
			agentName: 'Juan',
			hasSupports: true,
			companyIds: [1, 2],
			productIds: [5],
			originIds: [3],
			terms: [1, 2],
			periodicityIds: [10],
			agentCategoryIds: [4],
			agentIds: [7, 8],
			novedadStatuses: ['NUEVA', 'SIN_NOVEDAD'] as const,
		}

		const listParsed = businessListParamsSchema.parse({ ...allParams, page: '1', pageSize: '10' })
		const exportParsed = negociosExportBodySchema.parse(allParams)
		const filterOnly = businessFilterParamsSchema.parse(allParams)

		const listFilters = businessFilterParamsSchema.parse(listParsed)

		// All three must produce the same core filter params
		expect(listFilters).toEqual(filterOnly)
		expect(exportParsed).toEqual(filterOnly)

		// toBusinessListFilterInput must produce identical objects for list and export
		const filtersFromList = toBusinessListFilterInput({
			search: listParsed.search,
			status: listParsed.status,
			statuses: listParsed.statuses as string[],
			dateFrom: listParsed.dateFrom,
			dateTo: listParsed.dateTo,
			createdFrom: listParsed.createdFrom,
			createdTo: listParsed.createdTo,
			dateIssuedFrom: listParsed.dateIssuedFrom,
			dateIssuedTo: listParsed.dateIssuedTo,
			agentName: listParsed.agentName,
			hasSupports: listParsed.hasSupports,
			companyIds: listParsed.companyIds,
			productIds: listParsed.productIds,
			originIds: listParsed.originIds,
			terms: listParsed.terms,
			periodicityIds: listParsed.periodicityIds,
			agentCategoryIds: listParsed.agentCategoryIds,
			agentIds: listParsed.agentIds,
			novedadStatuses: listParsed.novedadStatuses,
		})
		const filtersFromExport = toBusinessListFilterInput({
			search: exportParsed.search,
			status: exportParsed.status,
			statuses: exportParsed.statuses as string[],
			dateFrom: exportParsed.dateFrom,
			dateTo: exportParsed.dateTo,
			createdFrom: exportParsed.createdFrom,
			createdTo: exportParsed.createdTo,
			dateIssuedFrom: exportParsed.dateIssuedFrom,
			dateIssuedTo: exportParsed.dateIssuedTo,
			agentName: exportParsed.agentName,
			hasSupports: exportParsed.hasSupports,
			companyIds: exportParsed.companyIds,
			productIds: exportParsed.productIds,
			originIds: exportParsed.originIds,
			terms: exportParsed.terms,
			periodicityIds: exportParsed.periodicityIds,
			agentCategoryIds: exportParsed.agentCategoryIds,
			agentIds: exportParsed.agentIds,
			novedadStatuses: exportParsed.novedadStatuses,
		})

		expect(filtersFromExport).toEqual(filtersFromList)
		expect(buildBusinessListWhere(adminUser, filtersFromList)).toEqual(
			buildBusinessListWhere(adminUser, filtersFromExport)
		)
	})

	it('single status backward compat: status=EMITIDO produces correct WHERE', () => {
		const listParsed = businessListParamsSchema.parse({ status: 'EMITIDO' })
		const filters = toBusinessListFilterInput({ status: listParsed.status })
		const where = buildBusinessListWhere(adminUser, filters)
		expect(where).toEqual({ AND: [{ status: 'EMITIDO' }] })
	})
})
