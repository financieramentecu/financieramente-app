/**
 * Orchestrates ABA-MFUND Excel export: count guard → detail → one-sheet workbook.
 * Empty hierarchy / empty result → empty error. Oversize → oversize error (HTTP 413 at route).
 */

import { prisma } from '@/lib/prisma'
import { buildAbaMfundWhere } from '../lib/build-aba-mfund-where'
import {
	buildAbaMfundExcelBuffer,
	buildAbaMfundExcelFilename,
} from '../lib/build-aba-mfund-excel'
import { getAbaMfundDetail } from './aba-mfund-detail.service'
import {
	ABA_MFUND_EXPORT_MAX_ROWS,
	type AbaMfundFilters,
} from '../types/aba-mfund.types'

export class AbaMfundExportEmptyError extends Error {
	constructor(message = 'No hay registros para exportar') {
		super(message)
		this.name = 'AbaMfundExportEmptyError'
	}
}

export class AbaMfundExportOversizeError extends Error {
	readonly maxRows: number

	constructor(maxRows: number = ABA_MFUND_EXPORT_MAX_ROWS) {
		super(
			`El resultado supera el máximo de ${maxRows} filas por exportación`
		)
		this.name = 'AbaMfundExportOversizeError'
		this.maxRows = maxRows
	}
}

export interface AbaMfundExportResult {
	readonly buffer: Buffer
	readonly rowCount: number
	readonly fileName: string
}

export async function countAbaMfundDetail(
	filters: AbaMfundFilters
): Promise<number> {
	if (filters.userIds.length === 0) return 0
	return prisma.business.count({
		where: buildAbaMfundWhere(filters),
	})
}

/**
 * Builds the Excel buffer for the same filters as the screen.
 * Throws empty / oversize errors for the route to map to 404 / 413.
 */
export async function exportAbaMfundExcel(
	filters: AbaMfundFilters
): Promise<AbaMfundExportResult> {
	if (filters.userIds.length === 0) {
		throw new AbaMfundExportEmptyError()
	}

	const rowCount = await countAbaMfundDetail(filters)

	if (rowCount === 0) {
		throw new AbaMfundExportEmptyError()
	}

	if (rowCount > ABA_MFUND_EXPORT_MAX_ROWS) {
		throw new AbaMfundExportOversizeError(ABA_MFUND_EXPORT_MAX_ROWS)
	}

	const detailPage = await getAbaMfundDetail({
		filters,
		cursor: null,
		limit: ABA_MFUND_EXPORT_MAX_ROWS,
	})

	const buffer = buildAbaMfundExcelBuffer({
		rows: detailPage.rows,
	})

	return {
		buffer,
		rowCount,
		fileName: buildAbaMfundExcelFilename(),
	}
}
