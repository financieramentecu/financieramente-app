import * as XLSX from 'xlsx-js-style'
import type { CrmReportSheet } from '@/features/leads/reports/build-crm-report-sheets'

const HEADER_STYLE = {
	font: { bold: true, color: { rgb: 'FFFFFF' } },
	fill: { fgColor: { rgb: '0F6E6E' } },
	alignment: { horizontal: 'center' as const },
}

interface StyledCell extends XLSX.CellObject {
	s?: typeof HEADER_STYLE
}

function applyHeaderStyles(worksheet: XLSX.WorkSheet): void {
	if (!worksheet['!ref']) return
	const range = XLSX.utils.decode_range(worksheet['!ref'])
	const widths: { wch: number }[] = []
	for (let column = range.s.c; column <= range.e.c; column += 1) {
		const header = worksheet[XLSX.utils.encode_cell({ r: 0, c: column })] as StyledCell | undefined
		if (header) header.s = HEADER_STYLE
		let width = header?.v != null ? String(header.v).length : 12
		for (let row = range.s.r + 1; row <= Math.min(range.e.r, 40); row += 1) {
			const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })] as XLSX.CellObject | undefined
			width = Math.max(width, cell?.v != null ? String(cell.v).length : 0)
		}
		widths.push({ wch: Math.min(width + 2, 42) })
	}
	worksheet['!cols'] = widths
}

/** Workbook with one sheet per CRM report section, including the per-lead detail. */
export function buildCrmReportWorkbook(sheets: readonly CrmReportSheet[]): Buffer {
	const workbook = XLSX.utils.book_new()
	for (const sheet of sheets) {
		const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows)
		applyHeaderStyles(worksheet)
		XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31))
	}
	return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
