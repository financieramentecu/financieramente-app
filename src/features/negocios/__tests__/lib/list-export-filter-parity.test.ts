import { describe, it, expect } from 'vitest'
import {
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
})
