'use client'

import { isFlagEnabled } from '@/features/shared/lib/feature-flag'
import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'

export interface FeatureFlagResult {
	enabled: boolean
	value: string | number | boolean | null
}

export function useFeatureFlag(flag: FeatureFlag): FeatureFlagResult {
	return { enabled: isFlagEnabled(flag), value: null }
}
