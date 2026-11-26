import { afterEach, describe, expect, it, vi } from 'vitest'
import { isFlagEnabled } from '../feature-flag'
import { isFeatureEnabledServer } from '../flagsmith-server'
import { ALL_FEATURE_FLAGS } from '@/features/shared/types/feature-flags.types'

afterEach(() => vi.unstubAllEnvs())

describe('deployment-based feature availability', () => {
	it.each(['development', 'test', 'production'])(
		'enables deployed tabs and their server checks without configuration in %s',
		async (nodeEnv) => {
			vi.stubEnv('NODE_ENV', nodeEnv)
			vi.stubEnv('NEXT_PUBLIC_APP_ENV', undefined)
			for (const flag of ALL_FEATURE_FLAGS) {
				expect(isFlagEnabled(flag)).toBe(true)
				expect(await isFeatureEnabledServer(flag)).toBe(true)
			}
		}
	)
})
