/**
 * Construcción del código de ProductConfiguration.
 * Formato: {COMPANY}-{PRODUCT}-{CATEGORY} en mayúsculas; espacios → '_'.
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
 * Construye el código de configuración company/product/category.
 * Formato: {COMPANY}-{PRODUCT}-{CATEGORY} (mayúsculas; espacios reemplazados por '_').
 *
 * @example
 * buildProductConfigurationCode('CREA PATRIMONIO', 'Propio', 'Junior')
 * // => 'CREA_PATRIMONIO-PROPIO-JUNIOR'
 */
export function buildProductConfigurationCode(
	companyName: string,
	productName: string,
	categoryName: string
): string {
	const company = normalizeSegment(companyName)
	const product = normalizeSegment(productName)
	const category = normalizeSegment(categoryName)
	return [company, product, category].join(SEPARATOR)
}
