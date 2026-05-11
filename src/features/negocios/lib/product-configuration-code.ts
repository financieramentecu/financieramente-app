/**
 * Construcción del código de ProductConfiguration.
 * Formato: {COMPANY}-{PRODUCT}-{LEVEL} en mayúsculas; espacios → '_'.
 */

const SEPARATOR = '-'
const SPACE_REPLACEMENT = '_'

/**
 * Normaliza un segmento del código: espacios → '_', mayúsculas.
 */
function normalizeSegment(segment: string): string {
	return segment.trim().replace(/\s+/g, SPACE_REPLACEMENT).toUpperCase()
}

/**
 * Construye el código de configuración company/product/level.
 * Formato: {COMPANY}-{PRODUCT}-{LEVEL} (mayúsculas; espacios reemplazados por '_').
 *
 * @example
 * buildProductConfigurationCode('CREA PATRIMONIO', 'Propio', 'LEVEL_0')
 * // => 'CREA_PATRIMONIO-PROPIO-LEVEL_0'
 */
export function buildProductConfigurationCode(
	companyName: string,
	productName: string,
	levelCode: string
): string {
	const company = normalizeSegment(companyName)
	const product = normalizeSegment(productName)
	const level = normalizeSegment(levelCode)
	return [company, product, level].join(SEPARATOR)
}
