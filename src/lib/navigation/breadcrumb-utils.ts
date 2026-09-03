export interface BreadcrumbItemShape {
	label: string
	href?: string
}

const SEGMENT_LABELS: Record<string, string> = {
	dashboard: 'Inicio',
	negocios: 'Negocios',
	'carga-archivos': 'Carga de archivos',
	'pre-liquidacion': 'Pre-liquidación',
	liquidaciones: 'Liquidaciones',
	liquidacion: 'Liquidación',
	reportes: 'Reportes',
	categorias: 'Categorías',
	empresas: 'Compañías',
	monedas: 'Monedas',
	origenes: 'Orígenes',
	products: 'Productos',
	admin: 'Administración',
	agente: 'Money Strategist',
	crear: 'Crear',
	editar: 'Editar',
	users: 'Usuarios',
	categories: 'Categorías',
	companies: 'Compañías',
	currencies: 'Monedas',
	origins: 'Orígenes',
	periodicities: 'Periodicidades',
	'config-distribucion-comisiones': 'Config. distribución de comisiones',
	'configuraciones-producto': 'Config. producto',
	reglas: 'Reglas',
	'report-permissions': 'Permisos de Reportes',
	'produccion-real': 'Producción Real',
	'aba-mfund': 'ABA-MFUND',
}

/**
 * Decodes one path segment. Next.js may leave segments percent-encoded in pathname.
 */
function decodePathSegment(raw: string): string {
	try {
		return decodeURIComponent(raw)
	} catch {
		return raw
	}
}

/**
 * Builds a path prefix with each segment encoded (valid href for dynamic codes with +, etc.).
 */
function encodePathPrefix(segments: readonly string[], endExclusive: number): string {
	const parts = segments.slice(0, endExclusive).map((s) =>
		encodeURIComponent(decodePathSegment(s))
	)
	return `/${parts.join('/')}`
}

/**
 * Genera breadcrumbs a partir del pathname actual.
 * Último segmento no lleva href (página actual).
 */
export function buildBreadcrumbsFromPathname(pathname: string): BreadcrumbItemShape[] {
	const allSegments = pathname.split('/').filter(Boolean)
	// Skip root 'dashboard' segment — it maps to "Inicio" which adds no navigational value
	const visible = allSegments
		.map((segment, originalIndex) => ({ segment, originalIndex }))
		.filter(({ segment }) => segment !== 'dashboard')

	if (visible.length === 0) return []

	return visible.map(({ segment, originalIndex }, index) => {
		const decoded = decodePathSegment(segment)
		const label = SEGMENT_LABELS[decoded] ?? SEGMENT_LABELS[segment] ?? decoded
		const href =
			index < visible.length - 1
				? encodePathPrefix(allSegments, originalIndex + 1)
				: undefined
		return { label, href }
	})
}
