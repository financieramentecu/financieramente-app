/**
 * Limpia un valor numérico removiendo símbolos de moneda, espacios y caracteres no numéricos
 * @param value - Valor a limpiar (puede ser string, number, o cualquier tipo)
 * @returns Número limpio o null si no se puede convertir
 */
export function cleanNumericValue(value: unknown): number | null {
	if (value === null || value === undefined) return null

	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null
	}

	let stringValue = String(value).trim()
	if (!stringValue) return null

	const isNegative =
		/^\(.*\)$/.test(stringValue) || stringValue.includes('-')

	if (stringValue.startsWith('(') && stringValue.endsWith(')')) {
		stringValue = stringValue.slice(1, -1)
	}

	stringValue = stringValue
		.replace(/[$€£¥₹₽₩₪₫₨₦₡₵₴₸₶₷₺₼₾₿]/g, '')
		.replace(/pesos?/gi, '')
		.replace(/d[oó]lares?/gi, '')
		.replace(/euros?/gi, '')
		.replace(/\s+/g, '')
		.replace(/-/g, '')

	if (!stringValue) return null

	const hasDot = stringValue.includes('.')
	const hasComma = stringValue.includes(',')

	if (hasDot && hasComma) {
		stringValue = stringValue.replace(/\./g, '').replace(/,/g, '.')
	} else if (hasComma) {
		stringValue = stringValue.replace(/,/g, '.')
	} else if (hasDot) {
		const dotCount = (stringValue.match(/\./g) || []).length
		if (dotCount > 1) {
			stringValue = stringValue.replace(/\./g, '')
		}
	}

	stringValue = stringValue.replace(/[^\d.]/g, '')

	if (!stringValue || stringValue === '.') return null

	const numValue = Number(stringValue)
	if (!Number.isFinite(numValue)) return null

	return isNegative ? -numValue : numValue
}

/**
 * Parses Base / Commission cells from Skandia load files.
 * Returns a non-negative finite magnitude, or null if unparsable.
 */
export function cleanLoadFileMoneyValue(value: unknown): number | null {
	if (value === null || value === undefined) return null

	if (typeof value === 'number') {
		return Number.isFinite(value) ? Math.abs(value) : null
	}

	let stringValue = String(value).trim()
	if (!stringValue) return null

	stringValue = stringValue
		.replace(/[$€£¥₹₽₩₪₫₨₦₡₵₴₸₶₷₺₼₾₿]/g, '')
		.replace(/pesos?/gi, '')
		.replace(/d[oó]lares?/gi, '')
		.replace(/euros?/gi, '')
		.replace(/\s+/g, '')
		.replace(/-/g, '')

	if (!stringValue) return null

	if (stringValue.startsWith('(') && stringValue.endsWith(')')) {
		stringValue = stringValue.slice(1, -1)
	}

	const hasDot = stringValue.includes('.')
	const hasComma = stringValue.includes(',')

	if (hasDot && hasComma) {
		const lastComma = stringValue.lastIndexOf(',')
		const lastDot = stringValue.lastIndexOf('.')
		if (lastDot > lastComma) {
			stringValue = stringValue.replace(/,/g, '')
		} else {
			stringValue = stringValue.replace(/\./g, '').replace(/,/g, '.')
		}
	} else if (hasComma) {
		stringValue = stringValue.replace(/,/g, '.')
	} else if (hasDot) {
		const dotCount = (stringValue.match(/\./g) || []).length
		if (dotCount > 1) {
			stringValue = stringValue.replace(/\./g, '')
		}
	}

	stringValue = stringValue.replace(/[^\d.]/g, '')

	if (!stringValue || stringValue === '.') return null

	const numValue = Number(stringValue)
	if (!Number.isFinite(numValue)) return null

	return Math.abs(numValue)
}

/**
 * Decimal string for Prisma from load-file money cells (non-negative magnitude).
 */
export function toDecimalFromLoadFileMoney(value: unknown): string {
	const numValue = cleanLoadFileMoneyValue(value)
	if (numValue === null) return '0'
	return numValue.toString()
}

/**
 * Convierte un valor a Decimal (string) para Prisma
 */
export function toDecimal(value: unknown): string {
	const numValue = cleanNumericValue(value)
	if (numValue === null) return '0'
	return numValue.toString()
}
