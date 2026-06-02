export const ALL_FEATURE_FLAGS = [
	'negocios_advanced_filters',
	'dashboard_simulador',
	'impersonation_select',
	'production_dashboard',
] as const

export type FeatureFlag = (typeof ALL_FEATURE_FLAGS)[number]

export type FlagsmithServerState = string
