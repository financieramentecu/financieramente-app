/**
 * Builds a styled 3-sheet Producción Real workbook (xlsx-js-style).
 * Sheet names and headers are Spanish (UI-facing).
 */

import * as XLSX from 'xlsx-js-style'
import { PRODUCCION_REAL_UI } from './ui-copy'
import type {
	ProduccionRealDetailRow,
	ProduccionRealKpis,
} from '../types/produccion-real.types'

export const PRODUCCION_REAL_SHEET = {
	RESUMEN_KPI: 'Resumen KPI',
	REGULAR_VS_UNICA: 'Regular vs Única',
	DETALLE: 'Detalle',
} as const

const HEADER_STYLE = {
	font: { bold: true },
	fill: { fgColor: { rgb: 'ADD8E6' } },
	alignment: { horizontal: 'center' as const },
	border: {
		bottom: { style: 'thin' as const, color: { rgb: '000000' } },
	},
}

interface StyledCell extends XLSX.CellObject {
	s?: typeof HEADER_STYLE
}

export interface BuildProduccionRealExcelInput {
	readonly kpis: ProduccionRealKpis
	readonly rows: readonly ProduccionRealDetailRow[]
}

const RESUMEN_HEADERS = [
	'Indicador',
	'Monto',
	'Cantidad',
	'% Conversión',
] as const

const COMPARISON_HEADERS = ['Tipo', 'Monto', 'Cantidad'] as const

const DETALLE_HEADERS = [
	PRODUCCION_REAL_UI.COLUMN_CREATED,
	PRODUCCION_REAL_UI.COLUMN_CLIENT,
	PRODUCCION_REAL_UI.COLUMN_AGENT,
	PRODUCCION_REAL_UI.COLUMN_COMPANY,
	PRODUCCION_REAL_UI.COLUMN_PRODUCT,
	PRODUCCION_REAL_UI.COLUMN_TYPE,
	PRODUCCION_REAL_UI.COLUMN_STATUS,
	PRODUCCION_REAL_UI.COLUMN_VALUE,
	PRODUCCION_REAL_UI.COLUMN_ISSUED,
	PRODUCCION_REAL_UI.COLUMN_ANCHORED,
] as const

function roundMoney(value: number): number {
	return Math.round(value * 100) / 100
}

function roundPercent(value: number): number {
	return Math.round(value * 100) / 100
}

function applyHeaderStyles(worksheet: XLSX.WorkSheet): void {
	if (!worksheet['!ref']) return

	const range = XLSX.utils.decode_range(worksheet['!ref'])
	const colWidths = Array.from({ length: range.e.c - range.s.c + 1 }, (_, i) => {
		const headerAddr = XLSX.utils.encode_cell({ r: 0, c: range.s.c + i })
		const headerCell = worksheet[headerAddr] as StyledCell | undefined
		const headerLen = headerCell?.v != null ? String(headerCell.v).length : 10
		return { wch: headerLen + 2 }
	})

	for (let C = range.s.c; C <= range.e.c; ++C) {
		const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C })
		const headerCell = worksheet[headerAddr] as StyledCell | undefined
		if (headerCell) {
			headerCell.s = HEADER_STYLE
		}

		for (let R = range.s.r + 1; R <= range.e.r; ++R) {
			const cellAddr = XLSX.utils.encode_cell({ r: R, c: C })
			const cell = worksheet[cellAddr]
			if (!cell) continue
			const valStr = cell.v != null ? String(cell.v) : ''
			const idx = C - range.s.c
			if (valStr.length + 2 > colWidths[idx].wch) {
				colWidths[idx].wch = valStr.length + 2
			}
		}
	}

	worksheet['!cols'] = colWidths.map((w) => ({ wch: Math.min(w.wch, 50) }))
}

function buildResumenRows(kpis: ProduccionRealKpis): Record<string, string | number>[] {
	return [
		{
			Indicador: PRODUCCION_REAL_UI.KPI_PRODUCCION_REAL,
			Monto: roundMoney(kpis.produccionReal.sum),
			Cantidad: kpis.produccionReal.count,
			'% Conversión': '',
		},
		{
			Indicador: PRODUCCION_REAL_UI.KPI_REGULAR,
			Monto: roundMoney(kpis.regular.sum),
			Cantidad: kpis.regular.count,
			'% Conversión': '',
		},
		{
			Indicador: PRODUCCION_REAL_UI.KPI_UNICO,
			Monto: roundMoney(kpis.unico.sum),
			Cantidad: kpis.unico.count,
			'% Conversión': '',
		},
		{
			Indicador: PRODUCCION_REAL_UI.KPI_FONDEADO,
			Monto: roundMoney(kpis.fondeado.sum),
			Cantidad: kpis.fondeado.count,
			'% Conversión': roundPercent(kpis.fondeado.conversionPercent),
		},
	]
}

function buildComparisonRows(
	kpis: ProduccionRealKpis
): Record<string, string | number>[] {
	return [
		{
			Tipo: PRODUCCION_REAL_UI.KPI_REGULAR,
			Monto: roundMoney(kpis.regular.sum),
			Cantidad: kpis.regular.count,
		},
		{
			Tipo: PRODUCCION_REAL_UI.KPI_UNICO,
			Monto: roundMoney(kpis.unico.sum),
			Cantidad: kpis.unico.count,
		},
	]
}

function buildDetalleRows(
	rows: readonly ProduccionRealDetailRow[]
): Record<string, string | number>[] {
	return rows.map((row) => ({
		[PRODUCCION_REAL_UI.COLUMN_CREATED]: row.createdAtLabel,
		[PRODUCCION_REAL_UI.COLUMN_CLIENT]: row.clientName,
		[PRODUCCION_REAL_UI.COLUMN_AGENT]: row.agentName,
		[PRODUCCION_REAL_UI.COLUMN_COMPANY]: row.companyName,
		[PRODUCCION_REAL_UI.COLUMN_PRODUCT]: row.productName,
		[PRODUCCION_REAL_UI.COLUMN_TYPE]: row.contributionTypeLabel,
		[PRODUCCION_REAL_UI.COLUMN_STATUS]: row.status ?? '',
		[PRODUCCION_REAL_UI.COLUMN_VALUE]: roundMoney(row.value),
		[PRODUCCION_REAL_UI.COLUMN_ISSUED]: row.dateIssuedLabel || '',
		[PRODUCCION_REAL_UI.COLUMN_ANCHORED]: row.dateAnchoredLabel || '',
	}))
}

/**
 * Returns an .xlsx buffer with Resumen KPI, Regular vs Única, and Detalle sheets.
 */
export function buildProduccionRealExcelBuffer(
	input: BuildProduccionRealExcelInput
): Buffer {
	const workbook = XLSX.utils.book_new()

	const resumenSheet = XLSX.utils.json_to_sheet(buildResumenRows(input.kpis), {
		header: [...RESUMEN_HEADERS],
	})
	applyHeaderStyles(resumenSheet)
	XLSX.utils.book_append_sheet(
		workbook,
		resumenSheet,
		PRODUCCION_REAL_SHEET.RESUMEN_KPI
	)

	const comparisonSheet = XLSX.utils.json_to_sheet(
		buildComparisonRows(input.kpis),
		{ header: [...COMPARISON_HEADERS] }
	)
	applyHeaderStyles(comparisonSheet)
	XLSX.utils.book_append_sheet(
		workbook,
		comparisonSheet,
		PRODUCCION_REAL_SHEET.REGULAR_VS_UNICA
	)

	const detalleSheet = XLSX.utils.json_to_sheet(buildDetalleRows(input.rows), {
		header: [...DETALLE_HEADERS],
	})
	applyHeaderStyles(detalleSheet)
	XLSX.utils.book_append_sheet(
		workbook,
		detalleSheet,
		PRODUCCION_REAL_SHEET.DETALLE
	)

	const excelBuffer = XLSX.write(workbook, {
		type: 'buffer',
		bookType: 'xlsx',
	}) as Buffer

	return excelBuffer
}
