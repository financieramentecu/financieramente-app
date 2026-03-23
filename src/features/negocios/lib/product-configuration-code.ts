/**
 * Construcción del código de ProductConfiguration.
 * Formato: {PRODUCTO}-{ORIGEN}-{CATEGORÍA} en mayúsculas; espacios → '_'.
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
 * Construye el código de configuración producto/origen/categoría.
 * Formato: {PRODUCTO}-{ORIGEN}-{CATEGORÍA} (mayúsculas; espacios reemplazados por '_').
 *
 * @example
 * buildProductConfigurationCode('CREA PATRIMONIO', 'Propio', 'Junior')
 * // => 'CREA_PATRIMONIO-PROPIO-JUNIOR'
 */
export function buildProductConfigurationCode(
	productName: string,
	originName: string,
	categoryName: string
): string {
	const product = normalizeSegment(productName)
	const origin = normalizeSegment(originName)
	const category = normalizeSegment(categoryName)
	return [product, origin, category].join(SEPARATOR)
}
