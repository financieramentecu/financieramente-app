/**
 * Builds a styled one-sheet ABA-MFUND workbook (xlsx-js-style).
 * Columns match the HU detail table. Sheet name and headers are Spanish.
 */

import * as XLSX from 'xlsx-js-style'
import { ABA_MFUND_STATUS_LABELS, ABA_MFUND_UI } from './ui-copy'
import type { AbaMfundDetailRow } from '../types/aba-mfund.types'

export const ABA_MFUND_SHEET = {
	DETAIL: ABA_MFUND_UI.DETAIL_TITLE,
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

export interface BuildAbaMfundExcelInput {
	readonly rows: readonly AbaMfundDetailRow[]
}

const DETAIL_HEADERS = [
	ABA_MFUND_UI.COLUMN_CREATED,
	ABA_MFUND_UI.COLUMN_CLIENT,
	ABA_MFUND_UI.COLUMN_PERIODICITY,
	ABA_MFUND_UI.COLUMN_STATUS,
	ABA_MFUND_UI.COLUMN_VALUE,
	ABA_MFUND_UI.COLUMN_ISSUED,
	ABA_MFUND_UI.COLUMN_ANCHORED,
] as const

function roundMoney(value: number): number {
	return Math.round(value * 100) / 100
}

function statusLabel(status: AbaMfundDetailRow['status']): string {
	if (!status) return ''
	return ABA_MFUND_STATUS_LABELS[status]
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

function buildDetalleRows(
	rows: readonly AbaMfundDetailRow[]
): Record<string, string | number>[] {
	return rows.map((row) => ({
		[ABA_MFUND_UI.COLUMN_CREATED]: row.createdAtLabel,
		[ABA_MFUND_UI.COLUMN_CLIENT]: row.clientName,
		[ABA_MFUND_UI.COLUMN_PERIODICITY]: row.periodicityName,
		[ABA_MFUND_UI.COLUMN_STATUS]: statusLabel(row.status),
		[ABA_MFUND_UI.COLUMN_VALUE]: roundMoney(row.value),
		[ABA_MFUND_UI.COLUMN_ISSUED]: row.dateIssuedLabel === '—' ? '' : row.dateIssuedLabel,
		[ABA_MFUND_UI.COLUMN_ANCHORED]:
			row.dateAnchoredLabel === '—' ? '' : row.dateAnchoredLabel,
	}))
}

/**
 * Filename `aba_mfund_<iso-timestamp>.xlsx` with filesystem-safe ISO chars.
 */
export function buildAbaMfundExcelFilename(now: Date = new Date()): string {
	const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5)
	return `aba_mfund_${timestamp}.xlsx`
}

/**
 * Returns an .xlsx buffer with a single Detalle sheet matching HU columns.
 */
export function buildAbaMfundExcelBuffer(
	input: BuildAbaMfundExcelInput
): Buffer {
	const workbook = XLSX.utils.book_new()
	const detalleSheet = XLSX.utils.json_to_sheet(buildDetalleRows(input.rows), {
		header: [...DETAIL_HEADERS],
	})
	applyHeaderStyles(detalleSheet)
	XLSX.utils.book_append_sheet(
		workbook,
		detalleSheet,
		ABA_MFUND_SHEET.DETAIL
	)

	const excelBuffer = XLSX.write(workbook, {
		type: 'buffer',
		bookType: 'xlsx',
	}) as Buffer

	return excelBuffer
}
