/**
 * Limpia un valor numérico removiendo símbolos de moneda, espacios y caracteres no numéricos
 * @param value - Valor a limpiar (puede ser string, number, o cualquier tipo)
 * @returns Número limpio o null si no se puede convertir
 */
export function cleanNumericValue(value: unknown): number | null {
	if (value === null || value === undefined) return null

	// Si ya es un número, retornarlo
	if (typeof value === 'number') {
		return isNaN(value) ? null : value
	}

	// Convertir a string y limpiar
	let stringValue = String(value).trim()

	if (!stringValue) return null

	// Remover símbolos comunes de moneda y formato
	// $, €, £, pesos, dólares, etc.
	stringValue = stringValue
		.replace(/[$€£¥₹₽₩₪₫₨₦₡₵₴₸₶₷₺₼₾₿]/g, '') // Símbolos de moneda
		.replace(/pesos?/gi, '')
		.replace(/dólares?/gi, '')
		.replace(/euros?/gi, '')
		.replace(/,/g, '') // Remover comas (separadores de miles)
		.replace(/\s+/g, '') // Remover espacios
		.replace(/[^\d.-]/g, '') // Solo dejar dígitos, puntos y guiones

	// Si quedó vacío, retornar null
	if (!stringValue) return null

	// Convertir a número
	const numValue = parseFloat(stringValue)

	return isNaN(numValue) ? null : numValue
}

/**
 * Convierte un valor a Decimal (string) para Prisma
 */
export function toDecimal(value: unknown): string {
	const numValue = cleanNumericValue(value)
	if (numValue === null) return '0'
	return numValue.toString()
}

