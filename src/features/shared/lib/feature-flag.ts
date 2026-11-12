import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'

const CRM_FEATURE_FLAGS = new Set<FeatureFlag>([
	'crm_timeline',
	'crm_tasks',
	'crm_cases',
	'crm_conversion_audit',
	'crm_imports',
	'crm_reports',
	'crm_lead_table',
	'crm_lead_fields',
])

/**
 * Flagsmith was removed because the hosted service rejected production reads.
 * Existing product modules stay on. CRM surfaces stay off outside local development.
 */
export function isFlagEnabled(flag: FeatureFlag): boolean {
	if (process.env.NODE_ENV === 'development') return true
	return !CRM_FEATURE_FLAGS.has(flag)
}
