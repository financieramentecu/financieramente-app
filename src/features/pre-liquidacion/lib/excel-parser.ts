import * as XLSX from 'xlsx'

/**
 * Interfaces compartidas para el parseo de archivos Excel
 */

// Tipos de archivo detectados
export type DetectedFileType = 'VOLUNTARIA' | 'POLIZA' | 'UNKNOWN'

// Resultado de validación de una fila
export interface RowValidationResult {
    isValid: boolean
    errors: string[] // Lista de errores encontrados
    warnings: string[] // Lista de advertencias (no bloqueantes)
}

// Datos crudos extraídos de la fila (Common + Specific)
export interface RawRowData {
    rowNumber: number
    // Campos comunes (Source A & B)
    productName?: string
    description?: string
    commissionValue?: number

    // Campos específicos Voluntarias
    baseCommission?: number

    // Campos específicos Polizas
    policyNumber?: string
    branch?: string
    receipt?: string
    premiumValue?: number
    originCommission?: string | null // NEW field for partial logic

    // Metadatos
    agentIdentity?: string
    agentName?: string
    isClawback?: boolean // T019: Detect 'claw' keyword
    paymentDate?: Date // T026: Used to identify period
}

// Resultado del parseo completo
export interface ParseResult {
    fileType: DetectedFileType
    rows: RawRowData[]
    validationErrors: { row: number; errors: string[] }[]
    summary: {
        totalRows: number
        validRows: number
        invalidRows: number
    }
}

// --- Implementation ---

const HEADERS_VOLUNTARIAS = ['Com', 'Base', 'Tipo de Comision', 'Producto']
const HEADERS_POLIZAS = ['Valor Comisión', 'Polizas Producto', 'Plan de Compensación']

export function detectFileType(headers: string[]): DetectedFileType {
    const hasVoluntarias = HEADERS_VOLUNTARIAS.every(h => headers.includes(h))
    if (hasVoluntarias) return 'VOLUNTARIA'

    // Check Polizas (partial match sometimes due to encoding?)
    const hasPolizas = HEADERS_POLIZAS.every(h => headers.some(header => header.includes(h)))
    if (hasPolizas) return 'POLIZA'

    return 'UNKNOWN'
}

export async function parseExcelFile(fileBuffer: Buffer): Promise<ParseResult> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Convert to JSON with headers
    const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 }) as unknown[][]

    if (rawData.length === 0) {
        return {
            fileType: 'UNKNOWN',
            rows: [],
            validationErrors: [],
            summary: { totalRows: 0, validRows: 0, invalidRows: 0 }
        }
    }

    const headers = (rawData[0] as string[]).map(h => (h || '').trim())
    const fileType = detectFileType(headers)

    if (fileType === 'UNKNOWN') {
        throw new Error('Formato de archivo no reconocido. Verifique los encabezados.')
    }

    const rows: RawRowData[] = []
    const validationErrors: { row: number; errors: string[] }[] = []

    // Start from row 1 (index 1) as 0 is header
    const dataRows = rawData.slice(1)

    let validCount = 0
    let invalidCount = 0

    dataRows.forEach((row, index) => {
        const rowNum = index + 2 // 1-based index, +1 header

        // Helper to get value by header name
        const getValue = (headerName: string): unknown => {
            const idx = headers.indexOf(headerName)
            if (idx === -1) return undefined
            return row[idx]
        }

        // Clean currency string "$ (1.234,56)" -> number
        const parseCurrency = (val: unknown): number | undefined => {
            if (typeof val === 'number') return val
            if (!val) return undefined
            const str = String(val).replace(/[$. ()]/g, '').replace(',', '.')
            const num = parseFloat(str)
            return isNaN(num) ? undefined : num
        }

        const parseString = (val: unknown): string | undefined => {
            return val ? String(val).trim() : undefined
        }

        const rowErrors: string[] = []
        const parsedRow: RawRowData = { rowNumber: rowNum }

        if (fileType === 'VOLUNTARIA') {
            // Mapping Voluntarias
            parsedRow.productName = parseString(getValue('Producto'))
            parsedRow.description = parseString(getValue('Tipo de Comision'))
            parsedRow.commissionValue = parseCurrency(getValue('Com'))
            parsedRow.baseCommission = parseCurrency(getValue('Base'))
            parsedRow.agentName = parseString(getValue('Nombre Fp')) // Example
            // Identity might be 'Cedula' or similar?

            if (parsedRow.commissionValue === undefined) rowErrors.push('Comisión inválida')
            if (!parsedRow.productName) rowErrors.push('Producto faltante')
        }
        else if (fileType === 'POLIZA') {
            // Mapping Polizas
            parsedRow.productName = parseString(getValue('Polizas Producto'))
            parsedRow.description = parseString(getValue('Plan de Compensación'))
            parsedRow.commissionValue = parseCurrency(getValue('Valor Comisión'))
            parsedRow.policyNumber = parseString(getValue('Poliza'))
            parsedRow.branch = parseString(getValue('Ramo')) // Assuming header 'Ramo' exist? Not strict check but good to have.
            parsedRow.receipt = parseString(getValue('Recibo')) // Assuming header 'Recibo'

            const rawDate = getValue('Fecha Pago') || getValue('Fecha Recaudo')
            if (rawDate) {
                // Check if it's Excel date number
                if (typeof rawDate === 'number') {
                    parsedRow.paymentDate = new Date(Date.UTC(1899, 11, 30 + rawDate))
                } else {
                    // Try parsing string
                    const d = new Date(String(rawDate))
                    if (!isNaN(d.getTime())) parsedRow.paymentDate = d
                }
            }

            // T015: Origin Mapping
            if (parsedRow.description === 'PROMOTOR_FRONT19_OMPEV') {
                parsedRow.originCommission = 'CARTERA'
            } else {
                parsedRow.originCommission = null
            }

            // T019: Claw Detection
            if (parsedRow.description && parsedRow.description.toLowerCase().includes('claw')) {
                parsedRow.isClawback = true
            } else {
                parsedRow.isClawback = false
            }

            if (parsedRow.commissionValue === undefined) rowErrors.push('Comisión inválida')
            if (!parsedRow.productName) rowErrors.push('Producto faltante')
        }

        if (rowErrors.length > 0) {
            validationErrors.push({ row: rowNum, errors: rowErrors })
            invalidCount++
        } else {
            rows.push(parsedRow)
            validCount++
        }
    })

    return {
        fileType,
        rows,
        validationErrors,
        summary: {
            totalRows: dataRows.length,
            validRows: validCount,
            invalidRows: invalidCount
        }
    }
}
