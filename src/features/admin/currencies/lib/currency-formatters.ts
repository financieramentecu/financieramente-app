/**
 * Utilidades para formatear y parsear valores de moneda colombiana
 * usando Intl.NumberFormat con locale es-CO
 */

const COLOMBIAN_LOCALE = 'es-CO'

/**
 * Formatea un número para mostrar en un input de moneda colombiana
 * Formato: separador de miles (punto), separador decimal (coma)
 * Ejemplo: 1000000.5 → "1.000.000,50"
 *
 * @param value - Número o string numérico a formatear
 * @returns String formateado con separadores colombianos
 */
export function formatCurrencyInput(value: number | string): string {
	if (value === '' || value === null || value === undefined) {
		return ''
	}

	const numValue = typeof value === 'string' ? parseFloat(value) : value

	if (isNaN(numValue) || !isFinite(numValue)) {
		return ''
	}

	// Usar Intl.NumberFormat para formatear según locale colombiano
	const formatter = new Intl.NumberFormat(COLOMBIAN_LOCALE, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
		useGrouping: true,
	})

	return formatter.format(numValue)
}

/**
 * Parsea un string formateado de moneda colombiana a número
 * Maneja separadores de miles (punto) y decimales (coma)
 * Ejemplo: "1.000.000,50" → 1000000.5
 *
 * @param value - String formateado con separadores colombianos
 * @returns Número parseado o null si el valor es inválido
 */
export function parseCurrencyInput(value: string): number | null {
	if (!value || value.trim() === '') {
		return null
	}

	let cleanedValue = value.trim()

	// Si solo tiene puntos o comas, retornar null
	if (/^[.,\s]+$/.test(cleanedValue)) {
		return null
	}

	// Validar que no tenga caracteres no numéricos excepto punto, coma y signo negativo
	if (!/^[\d.,\s-]+$/.test(cleanedValue)) {
		return null
	}

	// Validar formato: no puede tener múltiples comas (solo una coma decimal permitida)
	const commaCount = (cleanedValue.match(/,/g) || []).length
	if (commaCount > 1) {
		return null
	}

	// Validar que si hay coma, debe estar seguida de máximo 2 dígitos
	if (commaCount === 1) {
		const commaIndex = cleanedValue.indexOf(',')
		const afterComma = cleanedValue.substring(commaIndex + 1)
		// Remover espacios después de la coma
		const digitsAfterComma = afterComma.replace(/\s/g, '')
		if (!/^\d{0,2}$/.test(digitsAfterComma)) {
			return null
		}
	}

	// Validar que los puntos estén en posiciones correctas (solo como separadores de miles)
	// No puede haber puntos después de la coma decimal
	if (commaCount === 1) {
		const commaIndex = cleanedValue.indexOf(',')
		if (cleanedValue.substring(commaIndex).includes('.')) {
			return null
		}
	}

	// Remover espacios antes de validar formato
	cleanedValue = cleanedValue.replace(/\s/g, '')

	// Validar que los puntos no estén en posiciones completamente inválidas
	// No puede empezar o terminar con punto
	if (cleanedValue.startsWith('.') || cleanedValue.endsWith('.')) {
		return null
	}

	// No puede tener puntos consecutivos
	if (cleanedValue.includes('..')) {
		return null
	}

	// Validar formato básico: si hay puntos en la parte entera, deben estar separando dígitos
	// Dividir por la coma si existe para validar la parte entera
	const parts = commaCount === 1 ? cleanedValue.split(',') : [cleanedValue]
	let integerPart = parts[0]

	// Manejar signo negativo: removerlo temporalmente para validar formato
	const isNegative = integerPart.startsWith('-')
	if (isNegative) {
		integerPart = integerPart.substring(1)
	}

	// Si hay puntos en la parte entera, validar que cada parte entre puntos tenga dígitos
	if (integerPart.includes('.')) {
		const dotParts = integerPart.split('.')
		// Cada parte debe tener al menos un dígito
		for (const part of dotParts) {
			if (part.length === 0 || !/^\d+$/.test(part)) {
				return null
			}
		}
		// Rechazar casos claramente inválidos como "1.2.3" donde hay múltiples puntos
		// pero los grupos intermedios tienen menos de 3 dígitos (no son separadores de miles válidos)
		if (dotParts.length > 2) {
			// El primer grupo puede tener 1-3 dígitos
			// Los grupos intermedios (no el primero ni el último) deben tener exactamente 3 dígitos
			// El último grupo puede tener 1-3 dígitos
			for (let i = 1; i < dotParts.length - 1; i++) {
				// Grupos intermedios deben tener exactamente 3 dígitos
				if (dotParts[i].length !== 3) {
					return null
				}
			}
		} else if (dotParts.length === 2) {
			// Si hay exactamente 2 grupos, el primero puede tener 1-3 dígitos
			// pero si tiene menos de 3, podría ser un formato inválido como "1.2"
			// Sin embargo, "1.000" es válido, así que permitir si el segundo grupo tiene 3 dígitos
			if (dotParts[0].length < 1 || dotParts[1].length < 1) {
				return null
			}
		}
	}

	// Remover todos los puntos (separadores de miles)
	cleanedValue = cleanedValue.replace(/\./g, '')

	// Reemplazar coma por punto para el separador decimal
	cleanedValue = cleanedValue.replace(',', '.')

	// Intentar parsear el valor
	const numValue = parseFloat(cleanedValue)

	if (isNaN(numValue) || !isFinite(numValue)) {
		return null
	}

	return numValue
}

/**
 * Formatea un número como moneda con símbolo y código de moneda al final
 * Formato: $1.000.000 COP o $1,000 USD
 *
 * @param value - Número a formatear
 * @param currency - Código/símbolo de moneda (default: COP)
 * @returns String formateado con símbolo y código de moneda
 */
export function formatCurrency(
	value: number,
	currency: string = 'COP'
): string {
	// Normalizar el código de moneda
	const currencyCode = currency.toUpperCase()
	const isUSD = currencyCode === 'USD' || currencyCode === 'DÓLAR AMERICANO'
	const isCOP = currencyCode === 'COP' || currencyCode === 'PESO COLOMBIANO'

	// Determinar el código ISO para el formatter
	const isoCode = isUSD ? 'USD' : 'COP'

	const formatter = new Intl.NumberFormat(COLOMBIAN_LOCALE, {
		style: 'currency',
		currency: isoCode,
		minimumFractionDigits: isUSD ? 2 : 0,
		maximumFractionDigits: isUSD ? 2 : 0,
	})

	// Formatear el valor
	const formatted = formatter.format(value)

	// El formato ya incluye el símbolo, pero queremos asegurar que el código esté al final
	// Ejemplo: "$1.000.000" → "$1.000.000 COP"
	// Si no es COP ni USD conocido, añadir el currency symbol al final
	if (!isCOP && !isUSD) {
		// Para currencies desconocidos, usar formato numérico + symbol
		const numFormatter = new Intl.NumberFormat(COLOMBIAN_LOCALE, {
			minimumFractionDigits: isUSD ? 2 : 0,
			maximumFractionDigits: isUSD ? 2 : 0,
		})
		return `$${numFormatter.format(value)} ${currency}`
	}

	// Retornar con el código de moneda explícito
	// Remover cualquier código de moneda que Intl haya añadido y añadir el nuestro
	const numericPart = formatted.replace(/[A-Z$\s]/g, '').trim()
	return `$${numericPart} ${isUSD ? 'USD' : 'COP'}`
}

/**
 * Formatea un número de forma compacta para estadísticas
 * Ejemplo: 635000000 → "635M", 325000 → "325k"
 *
 * @param value - Número a formatear
 * @returns String formateado de forma compacta
 */
export function formatCompactNumber(value: number): string {
	if (value >= 1_000_000_000) {
		return `${(value / 1_000_000_000).toFixed(1).replace('.0', '')}B`
	}
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(0)}M`
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(0)}k`
	}
	return value.toString()
}
