import { ProcessedRecord } from './process-excel-file'

/**
 * Genera un reporte CSV con los registros que tuvieron errores
 */
export function generateErrorReportCSV(
	errorRecords: ProcessedRecord[],
	headers: string[]
): string {
	if (errorRecords.length === 0) {
		return ''
	}

	// Crear encabezados del CSV (incluir columna de errores)
	const csvHeaders = ['Fila', ...headers, 'Errores']

	// Función para escapar valores CSV
	const escapeCSV = (value: unknown): string => {
		if (value === null || value === undefined) return ''
		const stringValue = String(value)
		// Si contiene comas, comillas o saltos de línea, envolver en comillas y escapar comillas
		if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
			return `"${stringValue.replace(/"/g, '""')}"`
		}
		return stringValue
	}

	// Crear líneas del CSV
	const csvLines: string[] = []

	// Agregar encabezados
	csvLines.push(csvHeaders.map(escapeCSV).join(','))

	// Agregar registros con errores
	for (const record of errorRecords) {
		const row: string[] = [
			record.rowNumber.toString(),
			...headers.map((header) => escapeCSV(record.data[header] || '')),
			record.errors.join('; '), // Unir múltiples errores con punto y coma
		]
		csvLines.push(row.map(escapeCSV).join(','))
	}

	return csvLines.join('\n')
}

/**
 * Descarga un archivo CSV
 */
export function downloadCSV(content: string, filename: string): void {
	// Crear blob con BOM para UTF-8 (para que Excel lo reconozca correctamente)
	const BOM = '\uFEFF'
	const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })

	// Crear URL del blob
	const url = URL.createObjectURL(blob)

	// Crear elemento de descarga
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()

	// Limpiar
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

