import 'server-only'
import { isFlagEnabled } from '@/features/shared/lib/feature-flag'
import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'

/** Server flag check. The identity argument remains so callers stay stable after Flagsmith was removed. */
export async function isFeatureEnabledServer(flag: FeatureFlag, _identity?: string): Promise<boolean> {
	return isFlagEnabled(flag)
}
