import * as XLSX from 'xlsx'
import { FILE_TYPE_REQUIRED_HEADERS, type FileType } from './file-types'
import { findHeaderIndex } from './header-utils'
import { cleanNumericValue } from './number-utils'
import type { ProcessedRecord, ProcessResult } from '../types/load-file.types'

const DATE_COLUMNS = new Set(['Desde', 'Hasta'])
const NUMERIC_COLUMNS = new Set(['Base', 'Com', 'BASE', 'Valor Comisión'])

/**
 * Valida un registro individual
 */
function validateRecord(
	record: Record<string, unknown>,
	headers: string[],
	columnIndices: Map<string, number>,
	requiredHeaders: readonly string[]
): string[] {
	const errors: string[] = []

	// Validar que los campos requeridos no estén vacíos
	for (const requiredCol of requiredHeaders) {
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
		if (DATE_COLUMNS.has(requiredCol)) {
			// Validar formato de fecha (puede ser fecha, número serial o string)
			if (value && !isValidDate(value as string | number | Date)) {
				errors.push(`Campo "${requiredCol}" debe ser una fecha válida`)
			}
		}

		if (NUMERIC_COLUMNS.has(requiredCol)) {
			// Validar que sean números después de normalizar formato
			if (stringValue && cleanNumericValue(value) === null) {
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

	// Limpiar caracteres no imprimibles y espacios especiales (BOM, etc)
	const stringValue = String(value)
		.replace(/[\u200B-\u200D\uFEFF]/g, '')
		.trim()
	if (!stringValue) return false

	// Intentar formatos comunes de fecha con regex antes de New Date (más seguro)
	const dateFormats = [
		/^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
		/^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
		/^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
		/^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
	]

	if (dateFormats.some((format) => format.test(stringValue))) {
		const date = new Date(stringValue)
		return !isNaN(date.getTime())
	}

	// Como último recurso, intentar parsear directamente
	const date = new Date(stringValue)
	return !isNaN(date.getTime())
}

/**
 * Procesa un archivo Excel y valida cada registro
 */
export async function processExcelFile(
	file: File,
	fileType: FileType
): Promise<ProcessResult> {
	try {
		const requiredHeaders = FILE_TYPE_REQUIRED_HEADERS[fileType]

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
		for (const requiredCol of requiredHeaders) {
			const index = findHeaderIndex(headers, requiredCol)
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

			// Validar si la fila está vacía (ignorar filas totalmente vacías)
			const isEmptyRow = Object.values(record).every((val) => {
				const strVal = String(val).trim()
				return strVal === ''
			})

			if (isEmptyRow) {
				continue
			}

			// Validar registro
			const errors = validateRecord(
				record,
				headers,
				columnIndices,
				requiredHeaders
			)

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
