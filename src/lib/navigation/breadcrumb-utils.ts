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
	empresas: 'Empresas',
	origenes: 'Orígenes',
	products: 'Productos',
	admin: 'Administración',
	agente: 'Agente',
	crear: 'Crear',
	editar: 'Editar',
	users: 'Usuarios',
	categories: 'Categorías',
	companies: 'Empresas',
	currencies: 'Monedas',
	origins: 'Orígenes',
	periodicities: 'Periodicidades',
}

/**
 * Genera breadcrumbs a partir del pathname actual.
 * Último segmento no lleva href (página actual).
 */
export function buildBreadcrumbsFromPathname(pathname: string): BreadcrumbItemShape[] {
	const segments = pathname.split('/').filter(Boolean)
	if (segments.length === 0) return []

	return segments.map((segment, index) => {
		const label = SEGMENT_LABELS[segment] ?? segment
		const href = index < segments.length - 1 ? `/${segments.slice(0, index + 1).join('/')}` : undefined
		return { label, href }
	})
}
