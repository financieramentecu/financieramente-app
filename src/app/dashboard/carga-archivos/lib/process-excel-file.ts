import * as XLSX from 'xlsx'
import { REQUIRED_COLUMNS } from './validate-excel-structure'

export interface ProcessedRecord {
	rowNumber: number
	data: Record<string, unknown>
	isValid: boolean
	errors: string[]
}

export interface ProcessResult {
	successCount: number
	errorCount: number
	sincronizadoCount: number
	rezagadoCount: number
	validRecords: ProcessedRecord[]
	errorRecords: ProcessedRecord[]
	headers: string[]
}

/**
 * Normaliza el nombre de una columna para comparación
 */
function normalizeColumnName(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/[áàäâ]/g, 'a')
		.replace(/[éèëê]/g, 'e')
		.replace(/[íìïî]/g, 'i')
		.replace(/[óòöô]/g, 'o')
		.replace(/[úùüû]/g, 'u')
		.replace(/ñ/g, 'n')
}

/**
 * Encuentra el índice de una columna requerida en los headers
 */
function findColumnIndex(
	headers: string[],
	requiredColumn: string
): number {
	const normalizedRequired = normalizeColumnName(requiredColumn)
	const normalizedHeaders = headers.map((h) => normalizeColumnName(h || ''))

	for (let i = 0; i < normalizedHeaders.length; i++) {
		const h = normalizedHeaders[i]
		if (h === normalizedRequired) return i

		// Para columnas con múltiples palabras
		const requiredWords = normalizedRequired.split(' ').filter((w) => w.length > 0)
		if (requiredWords.length > 1) {
			let lastIndex = -1
			let allWordsFound = true
			for (const word of requiredWords) {
				const wordIndex = h.indexOf(word)
				if (wordIndex === -1 || wordIndex < lastIndex) {
					allWordsFound = false
					break
				}
				lastIndex = wordIndex
			}
			if (allWordsFound) return i
		}

		// Para columnas de una sola palabra
		if (requiredWords.length === 1) {
			const word = requiredWords[0]
			const wordRegex = new RegExp(`\\b${word}\\b`, 'i')
			if (wordRegex.test(h)) return i
		}
	}

	return -1
}

/**
 * Valida un registro individual
 */
function validateRecord(
	record: Record<string, unknown>,
	headers: string[],
	columnIndices: Map<string, number>
): string[] {
	const errors: string[] = []

	// Validar que los campos requeridos no estén vacíos
	for (const requiredCol of REQUIRED_COLUMNS) {
		const colIndex = columnIndices.get(requiredCol)
		if (colIndex === undefined || colIndex === -1) {
			errors.push(`Columna "${requiredCol}" no encontrada`)
			continue
		}

		const value = record[headers[colIndex]]
		const stringValue = value?.toString().trim() || ''

		// Validar campos requeridos
		if (!stringValue) {
			errors.push(`Campo "${requiredCol}" es requerido`)
		}

		// Validaciones específicas por tipo de campo
		if (requiredCol === 'Desde' || requiredCol === 'Hasta') {
			// Validar formato de fecha (puede ser fecha o string)
			if (stringValue && !isValidDate(stringValue)) {
				errors.push(`Campo "${requiredCol}" debe ser una fecha válida`)
			}
		}

		if (requiredCol === 'Cto' || requiredCol === 'Base' || requiredCol === 'Com') {
			// Validar que sean números
			if (stringValue && isNaN(Number(stringValue))) {
				errors.push(`Campo "${requiredCol}" debe ser un número válido`)
			}
		}
	}

	return errors
}

/**
 * Valida si un valor es una fecha válida
 */
function isValidDate(value: string | number | Date): boolean {
	if (!value) return false
	if (value instanceof Date) return !isNaN(value.getTime())
	if (typeof value === 'number') {
		// Si es un número de Excel (días desde 1900-01-01)
		if (value > 0 && value < 100000) {
			return true
		}
		return !isNaN(new Date(value).getTime())
	}
	
	const stringValue = String(value).trim()
	if (!stringValue) return false
	
	// Intentar parsear como fecha
	const date = new Date(stringValue)
	if (!isNaN(date.getTime())) return true
	
	// Intentar formatos comunes de fecha
	const dateFormats = [
		/^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
		/^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
		/^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
	]
	
	return dateFormats.some(format => format.test(stringValue))
}

/**
 * Procesa un archivo Excel y valida cada registro
 */
export async function processExcelFile(file: File): Promise<ProcessResult> {
	try {
		// Leer el archivo
		const arrayBuffer = await file.arrayBuffer()
		const workbook = XLSX.read(arrayBuffer, { type: 'array' })

		// Obtener la primera hoja
		const firstSheetName = workbook.SheetNames[0]
		if (!firstSheetName) {
			throw new Error('El archivo Excel no contiene hojas de cálculo')
		}

		const worksheet = workbook.Sheets[firstSheetName]

		// Convertir a JSON con headers
		const data = XLSX.utils.sheet_to_json(worksheet, {
			header: 1,
			defval: '',
		}) as unknown[][]

		if (data.length === 0) {
			throw new Error('El archivo Excel está vacío')
		}

		// Obtener headers (primera fila)
		const headers = (data[0] as string[]).map((h) => h?.toString().trim() || '')

		// Crear mapa de índices de columnas requeridas
		const columnIndices = new Map<string, number>()
		for (const requiredCol of REQUIRED_COLUMNS) {
			const index = findColumnIndex(headers, requiredCol)
			columnIndices.set(requiredCol, index)
		}

		// Procesar registros (empezar desde la fila 2, ya que la 1 son los headers)
		const validRecords: ProcessedRecord[] = []
		const errorRecords: ProcessedRecord[] = []

		for (let i = 1; i < data.length; i++) {
			const row = data[i] as unknown[]
			const rowNumber = i + 1 // Número de fila en Excel (1-indexed)

			// Convertir fila a objeto
			const record: Record<string, unknown> = {}
			headers.forEach((header, index) => {
				record[header] = row[index] ?? ''
			})

			// Validar registro
			const errors = validateRecord(record, headers, columnIndices)

			const processedRecord: ProcessedRecord = {
				rowNumber,
				data: record,
				isValid: errors.length === 0,
				errors,
			}

			if (errors.length === 0) {
				validRecords.push(processedRecord)
			} else {
				errorRecords.push(processedRecord)
			}
		}

		return {
			successCount: validRecords.length,
			errorCount: errorRecords.length,
			sincronizadoCount: 0, // Se actualizará después del procesamiento
			rezagadoCount: 0, // Se actualizará después del procesamiento
			validRecords,
			errorRecords,
			headers,
		}
	} catch (error) {
		console.error('Error al procesar archivo Excel:', error)
		throw error
	}
}

