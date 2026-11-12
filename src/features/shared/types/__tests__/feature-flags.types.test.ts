import { describe, expect, it } from 'vitest'
import { ALL_FEATURE_FLAGS } from '@/features/shared/types/feature-flags.types'

describe('CRM feature flags', () => {
	it('declares every CRM rollout flag', () => {
		expect(ALL_FEATURE_FLAGS).toEqual(
			expect.arrayContaining([
				'crm_timeline',
				'crm_tasks',
				'crm_cases',
				'crm_conversion_audit',
				'crm_imports',
			])
		)
	})
})
