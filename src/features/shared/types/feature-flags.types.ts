export const ALL_FEATURE_FLAGS = [
	'negocios_advanced_filters',
	'dashboard_calculadora',
	'impersonation_select',
	'production_dashboard',
	'leads_module',
	'reportes_produccion_real',
	'reportes_leads_analytics',
	'reportes_aba_mfund',
	'crm_timeline',
	'crm_tasks',
	'crm_cases',
	'crm_conversion_audit',
	'crm_imports',
	'crm_reports',
	'crm_lead_table',
	'crm_lead_fields',
] as const

export type FeatureFlag = (typeof ALL_FEATURE_FLAGS)[number]

export type FlagsmithServerState = string
