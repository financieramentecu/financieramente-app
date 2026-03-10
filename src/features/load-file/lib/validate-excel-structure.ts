import * as XLSX from 'xlsx'
import { FILE_TYPE_REQUIRED_HEADERS, type FileType } from './file-types'
import { findMissingHeaders } from './header-utils'
import { readWorkbookFromFile } from './read-workbook'

/**
 * Columnas requeridas para el formato Skandia
 */
export interface ValidationResult {
	isValid: boolean
	error?: string
	missingColumns?: string[]
	incorrectColumns?: string[]
}

/**
 * Valida la estructura de un archivo Excel para el formato Skandia
 * @param file - Archivo Excel a validar
 * @returns Resultado de la validación con información sobre columnas faltantes o incorrectas
 */
export async function validateExcelStructure(
	file: File,
	fileType: FileType
): Promise<ValidationResult> {
	try {
		const requiredHeaders = FILE_TYPE_REQUIRED_HEADERS[fileType]

		// Use shared reader: UTF-8 decoding for CSV so accented headers/cells are not corrupted
		const workbook = await readWorkbookFromFile(file)

		// Obtener la primera hoja
		const firstSheetName = workbook.SheetNames[0]
		if (!firstSheetName) {
			return {
				isValid: false,
				error: 'El archivo Excel no contiene hojas de cálculo',
			}
		}

		const worksheet = workbook.Sheets[firstSheetName]

		// Convertir la hoja a JSON para obtener las columnas
		const data = XLSX.utils.sheet_to_json(worksheet, {
			header: 1,
			defval: '',
		}) as unknown[][]

		if (data.length === 0) {
			return {
				isValid: false,
				error: 'El archivo Excel está vacío',
			}
		}

		// La primera fila debe contener los encabezados
		const headers = (data[0] as string[]).map((header) =>
			header?.toString().trim()
		)

		if (headers.length === 0) {
			return {
				isValid: false,
				error: 'El archivo Excel no contiene encabezados',
			}
		}

		const missingColumns = findMissingHeaders(headers, requiredHeaders)

		// Si hay columnas faltantes, retornar error
		if (missingColumns.length > 0) {
			return {
				isValid: false,
				error:
					'El archivo no contiene la estructura esperada de Skandia. Verifique las columnas requeridas.',
				missingColumns,
			}
		}

		// Validación exitosa
		return {
			isValid: true,
		}
	} catch (error) {
		console.error('Error al validar estructura del archivo:', error)
		return {
			isValid: false,
			error:
				'Error al leer el archivo Excel. Asegúrese de que el archivo no esté corrupto.',
		}
	}
}
