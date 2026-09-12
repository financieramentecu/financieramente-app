/**
 * Stable report catalog codes (machine identifiers).
 * UI titles live on ReportDefinition.name and stay Spanish.
 */
export const REPORT_CODES = {
	PRODUCCION_REAL: 'PRODUCCION_REAL',
	LEADS_ANALYTICS: 'LEADS_ANALYTICS',
	ABA_MFUND: 'ABA_MFUND',
} as const

export type ReportCode = (typeof REPORT_CODES)[keyof typeof REPORT_CODES]

export interface KnownReportDefinition {
	readonly code: ReportCode
	readonly name: string
	readonly description: string
	readonly routePath: string
}

/** Canonical catalog metadata. Admin Permisos de Reportes must list every entry. */
export const KNOWN_REPORT_DEFINITIONS: readonly KnownReportDefinition[] = [
	{
		code: REPORT_CODES.PRODUCCION_REAL,
		name: 'Producción Real',
		description: 'Reporte de Producción Real con filtros, jerarquía y KPIs',
		routePath: '/dashboard/reportes/produccion-real',
	},
	{
		code: REPORT_CODES.LEADS_ANALYTICS,
		name: 'Analítica de Leads',
		description:
			'Reporte dinámico de leads por estado de seguimiento, conversión a negocio y carga por asesor',
		routePath: '/dashboard/reportes/leads-analytics',
	},
	{
		code: REPORT_CODES.ABA_MFUND,
		name: 'ABA-MFUND',
		description:
			'Reporte ABA-MFUND (SKANDIA + MFUND) con KPIs, ranking y detalle',
		routePath: '/dashboard/reportes/aba-mfund',
	},
]

export interface ReportDefinitionDto {
	readonly id: number
	readonly code: string
	readonly name: string
	readonly description: string | null
	readonly routePath: string
	readonly status: boolean
}

export interface CategoryPermissionRow {
	readonly idCategory: number
	readonly name: string
	readonly enabled: boolean
}

export interface ReportPermissionMatrix {
	readonly report: ReportDefinitionDto
	readonly categories: readonly CategoryPermissionRow[]
}

export interface ReportPermissionsCatalog {
	readonly reports: readonly ReportDefinitionDto[]
	readonly matrix: ReportPermissionMatrix | null
}

export interface AuthorizedReportsDto {
	readonly codes: readonly string[]
}
