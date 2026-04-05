import * as XLSX from 'xlsx'

/**
 * Exporta un array de objetos a un archivo Excel (.xlsx)
 * @param data Datos a exportar
 * @param fileName Nombre del archivo (sin extensión)
 * @param sheetName Nombre de la hoja
 */
export function exportToExcel<T>(
	data: T[],
	fileName: string = 'export',
	sheetName: string = 'Datos'
) {
	const worksheet = XLSX.utils.json_to_sheet(data)
	const workbook = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

	/* Generar y descargar el archivo */
	XLSX.writeFile(workbook, `${fileName}.xlsx`)
}
