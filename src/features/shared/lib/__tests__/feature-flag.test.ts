import { afterEach, describe, expect, it, vi } from 'vitest'
import { isFlagEnabled } from '../feature-flag'
import { isFeatureEnabledServer } from '../flagsmith-server'
import { ALL_FEATURE_FLAGS } from '@/features/shared/types/feature-flags.types'

afterEach(() => vi.unstubAllEnvs())

describe('CRM rollout environments', () => {
	it.each(['development', 'test', 'production'])(
		'enables QA tabs and their server guards with NODE_ENV=%s',
		async (nodeEnv) => {
			vi.stubEnv('NODE_ENV', nodeEnv)
			vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'qa')
			for (const flag of ALL_FEATURE_FLAGS) {
				expect(isFlagEnabled(flag)).toBe(true)
				expect(await isFeatureEnabledServer(flag)).toBe(true)
			}
		}
	)
	it.each([undefined, 'production', 'staging', 'QA'])(
		'keeps CRM off for a production build with app environment %s',
		async (appEnv) => {
			vi.stubEnv('NODE_ENV', 'production')
			vi.stubEnv('NEXT_PUBLIC_APP_ENV', appEnv)
			for (const flag of ALL_FEATURE_FLAGS) {
				const expected = !flag.startsWith('crm_')
				expect(isFlagEnabled(flag)).toBe(expected)
				expect(await isFeatureEnabledServer(flag)).toBe(expected)
			}
		}
	)
	it('keeps local development available without a deployment label', () => {
		vi.stubEnv('NODE_ENV', 'development')
		vi.stubEnv('NEXT_PUBLIC_APP_ENV', undefined)
		for (const flag of ALL_FEATURE_FLAGS) expect(isFlagEnabled(flag)).toBe(true)
	})
})
