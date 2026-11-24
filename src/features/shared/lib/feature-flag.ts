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
 * Existing product modules stay on. CRM is available locally and in QA builds.
 */
export function isFlagEnabled(flag: FeatureFlag): boolean {
	if (
		process.env.NODE_ENV === 'development' ||
		process.env.NEXT_PUBLIC_APP_ENV === 'qa'
	)
		return true
	return !CRM_FEATURE_FLAGS.has(flag)
}
