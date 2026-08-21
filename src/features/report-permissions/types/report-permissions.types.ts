/**
 * Stable report catalog codes (machine identifiers).
 * UI titles live on ReportDefinition.name and stay Spanish.
 */
export const REPORT_CODES = {
	PRODUCCION_REAL: 'PRODUCCION_REAL',
	LEADS_ANALYTICS: 'LEADS_ANALYTICS',
} as const

export type ReportCode = (typeof REPORT_CODES)[keyof typeof REPORT_CODES]

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
