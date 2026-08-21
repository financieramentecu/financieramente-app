export const ALL_FEATURE_FLAGS = [
	'negocios_advanced_filters',
	'dashboard_calculadora',
	'impersonation_select',
	'production_dashboard',
	'leads_module',
	'reportes_produccion_real',
	'reportes_leads_analytics',
] as const

export type FeatureFlag = (typeof ALL_FEATURE_FLAGS)[number]

export type FlagsmithServerState = string
