import * as XLSX from 'xlsx'

/**
 * Detects if the file is CSV (by name or MIME type) so we can use UTF-8 decoding.
 * CSV files often have wrong encoding when read as raw buffer; explicit UTF-8 avoids mojibake.
 */
function isCsvFile(file: File): boolean {
	const name = file.name.toLowerCase()
	const type = (file.type || '').toLowerCase()
	return name.endsWith('.csv') || type === 'text/csv' || type === 'application/csv'
}

/**
 * Reads a File into an XLSX.WorkBook. For CSV (and text-based) files, decodes the buffer
 * as UTF-8 before passing to SheetJS so that Spanish accented characters in headers
 * and cells are not corrupted. For binary formats (xlsx, xls), uses array buffer directly.
 */
export async function readWorkbookFromFile(file: File): Promise<XLSX.WorkBook> {
	const arrayBuffer = await file.arrayBuffer()

	if (isCsvFile(file)) {
		const decoded = new TextDecoder('utf-8').decode(arrayBuffer)
		return XLSX.read(decoded, { type: 'string' })
	}

	return XLSX.read(arrayBuffer, { type: 'array' })
}
