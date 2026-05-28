'use client'
import { useFlags } from '@flagsmith/flagsmith/react'
import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'

export interface FeatureFlagResult {
	enabled: boolean
	value: string | number | boolean | null
}

export function useFeatureFlag(flag: FeatureFlag): FeatureFlagResult {
	const flags = useFlags([flag])
	const entry = flags[flag]
	return { enabled: entry?.enabled ?? false, value: entry?.value ?? null }
}
