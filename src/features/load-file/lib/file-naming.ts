const SPANISH_MONTHS: Readonly<Record<number, string>> = {
	1: 'ENERO',
	2: 'FEBRERO',
	3: 'MARZO',
	4: 'ABRIL',
	5: 'MAYO',
	6: 'JUNIO',
	7: 'JULIO',
	8: 'AGOSTO',
	9: 'SEPTIEMBRE',
	10: 'OCTUBRE',
	11: 'NOVIEMBRE',
	12: 'DICIEMBRE',
} as const

/**
 * Generates the standardized FileImport name.
 * Example: generateSyncFileName('POLIZA', 2, 2026) → 'SINCRONIZACION-POLIZA-FEBRERO-2026'
 *
 * @throws {Error} If month is not in the range 1–12
 */
export function generateSyncFileName(
	fileType: string,
	month: number,
	year: number
): string {
	const monthName = SPANISH_MONTHS[month]
	if (!monthName) throw new Error(`Invalid month: ${month}`)
	return `SINCRONIZACION-${fileType.toUpperCase()}-${monthName}-${year}`
}
