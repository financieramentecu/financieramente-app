import * as XLSX from 'xlsx'

/**
 * Columnas requeridas para el formato Skandia
 */
export const REQUIRED_COLUMNS = [
	'Nombre',
	'Franquicia',
	'Desde',
	'Hasta',
	'Nombre Fp',
	'Sub Grupo Fp',
	'Compania',
	'Producto',
	'Tipo Comisión',
	'Cto',
	'Base',
	'Com',
] as const

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
	file: File
): Promise<ValidationResult> {
	try {
		// Leer el archivo como array buffer
		const arrayBuffer = await file.arrayBuffer()
		const workbook = XLSX.read(arrayBuffer, { type: 'array' })

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

		// Función para normalizar nombres de columnas (eliminar espacios, acentos, convertir a minúsculas)
		const normalizeColumnName = (name: string): string => {
			return name
				.toLowerCase()
				.trim()
				.replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
				.replace(/[áàäâ]/g, 'a')
				.replace(/[éèëê]/g, 'e')
				.replace(/[íìïî]/g, 'i')
				.replace(/[óòöô]/g, 'o')
				.replace(/[úùüû]/g, 'u')
				.replace(/ñ/g, 'n')
		}

		// Normalizar los encabezados
		const normalizedHeaders = headers.map((h) => normalizeColumnName(h || ''))

		// Encontrar columnas faltantes
		const missingColumns: string[] = []

		for (const requiredCol of REQUIRED_COLUMNS) {
			const normalizedRequired = normalizeColumnName(requiredCol)
			// Buscar coincidencia exacta primero
			let found = normalizedHeaders.some((h) => h === normalizedRequired)

			// Si no hay coincidencia exacta, buscar coincidencia flexible
			// (para casos como "Nombre Fp" vs "Nombre FP" o "nombre fp")
			if (!found) {
				found = normalizedHeaders.some((h) => {
					// Coincidencia exacta después de normalización
					if (h === normalizedRequired) return true

					// Para columnas con múltiples palabras, verificar que todas las palabras estén presentes
					// y en el orden correcto (aproximado)
					const requiredWords = normalizedRequired.split(' ').filter((w) => w.length > 0)
					if (requiredWords.length > 1) {
						// Verificar que todas las palabras estén presentes en orden
						let lastIndex = -1
						for (const word of requiredWords) {
							const wordIndex = h.indexOf(word)
							if (wordIndex === -1 || wordIndex < lastIndex) {
								return false
							}
							lastIndex = wordIndex
						}
						return true
					}

					// Para columnas de una sola palabra, buscar coincidencia exacta o que contenga la palabra completa
					if (requiredWords.length === 1) {
						const word = requiredWords[0]
						// Buscar que la palabra esté como palabra completa (no como parte de otra palabra)
						const wordRegex = new RegExp(`\\b${word}\\b`, 'i')
						return wordRegex.test(h)
					}

					return false
				})
			}

			if (!found) {
				missingColumns.push(requiredCol)
			}
		}

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

