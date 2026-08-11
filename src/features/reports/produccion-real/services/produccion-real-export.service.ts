/**
 * Orchestrates Producción Real Excel export: count guard → KPIs + detail → workbook.
 */

import { prisma } from '@/lib/prisma'
import { buildProduccionRealWhere } from '../lib/build-produccion-real-where'
import { buildProduccionRealExcelBuffer } from '../lib/build-produccion-real-excel'
import { PRODUCCION_REAL_EXPORT_MAX_ROWS } from '../lib/export-limits'
import { getProduccionRealKpis } from './produccion-real-kpi.service'
import { getProduccionRealDetail } from './produccion-real-detail.service'
import type {
	ProduccionRealFilters,
	ProduccionRealKpiQuery,
} from '../types/produccion-real.types'

export class ProduccionRealExportEmptyError extends Error {
	constructor(message = 'No hay registros para exportar') {
		super(message)
		this.name = 'ProduccionRealExportEmptyError'
	}
}

export class ProduccionRealExportOversizeError extends Error {
	readonly maxRows: number

	constructor(maxRows: number = PRODUCCION_REAL_EXPORT_MAX_ROWS) {
		super(
			`El resultado supera el máximo de ${maxRows} filas por exportación`
		)
		this.name = 'ProduccionRealExportOversizeError'
		this.maxRows = maxRows
	}
}

export interface ProduccionRealExportResult {
	readonly buffer: Buffer
	readonly rowCount: number
}

export async function countProduccionRealDetail(
	filters: ProduccionRealFilters
): Promise<number> {
	if (filters.userIds.length === 0) return 0
	return prisma.business.count({
		where: buildProduccionRealWhere(filters),
	})
}

/**
 * Builds the Excel buffer for the same filters as the screen.
 * Throws empty / oversize errors for the route to map to 404 / 413.
 */
export async function exportProduccionRealExcel(
	query: ProduccionRealKpiQuery
): Promise<ProduccionRealExportResult> {
	const { filters, trmRate } = query

	if (filters.userIds.length === 0) {
		throw new ProduccionRealExportEmptyError()
	}

	const rowCount = await countProduccionRealDetail(filters)

	if (rowCount === 0) {
		throw new ProduccionRealExportEmptyError()
	}

	if (rowCount > PRODUCCION_REAL_EXPORT_MAX_ROWS) {
		throw new ProduccionRealExportOversizeError(PRODUCCION_REAL_EXPORT_MAX_ROWS)
	}

	const [kpis, detailPage] = await Promise.all([
		getProduccionRealKpis({ filters, trmRate }),
		getProduccionRealDetail({
			filters,
			trmRate,
			cursor: null,
			limit: PRODUCCION_REAL_EXPORT_MAX_ROWS,
		}),
	])

	const buffer = buildProduccionRealExcelBuffer({
		kpis,
		rows: detailPage.rows,
	})

	return { buffer, rowCount }
}
