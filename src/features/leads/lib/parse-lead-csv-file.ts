import * as XLSX from 'xlsx'
import { LEAD_CSV_HEADERS, type LeadCsvHeader } from '@/features/leads/lib/lead-csv-template'

export type LeadCsvRawRow = Record<LeadCsvHeader, string>

export type ParseLeadCsvFileResult =
	| { rejected: false; rows: LeadCsvRawRow[] }
	| { rejected: true; reason: string }

/**
 * Header check + row extraction from the workbook returned by
 * `readWorkbookFromFile`. Rejects the whole file, pre-row-loop, when the
 * header row doesn't match `LEAD_CSV_HEADERS` exactly in count and order —
 * distinct from per-row validation, which happens later in the Zod schema.
 */
export function parseLeadCsvFile(workbook: XLSX.WorkBook): ParseLeadCsvFileResult {
	const firstSheetName = workbook.SheetNames[0]
	if (!firstSheetName) {
		return { rejected: true, reason: 'El archivo no contiene hojas de cálculo' }
	}

	const worksheet = workbook.Sheets[firstSheetName]
	const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][]

	if (data.length === 0) {
		return { rejected: true, reason: 'El archivo está vacío' }
	}

	const headerRow = (data[0] as string[]).map((header) => header?.toString().trim())
	const expected = LEAD_CSV_HEADERS as readonly string[]

	const headersMatch =
		headerRow.length === expected.length && headerRow.every((header, index) => header === expected[index])

	if (!headersMatch) {
		return {
			rejected: true,
			reason: `Encabezados inválidos. Se esperaban exactamente: ${expected.join(', ')}`,
		}
	}

	const rows: LeadCsvRawRow[] = data.slice(1).map((dataRow) => {
		const row = {} as LeadCsvRawRow
		LEAD_CSV_HEADERS.forEach((header, index) => {
			row[header] = (dataRow[index] ?? '').toString()
		})
		return row
	})

	return { rejected: false, rows }
}
