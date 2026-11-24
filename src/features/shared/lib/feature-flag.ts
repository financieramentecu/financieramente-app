import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'

/** Availability follows deployed code; request guards enforce roles and record access. */
export function isFlagEnabled(_flag: FeatureFlag): boolean {
	return true
}
