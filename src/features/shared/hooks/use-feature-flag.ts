'use client'
import { useFlags, useFlagsmith } from '@flagsmith/flagsmith/react'
import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'

export interface FeatureFlagResult {
	enabled: boolean
	value: string | number | boolean | null
}

const FALLBACK: FeatureFlagResult = { enabled: false, value: null }

export function useFeatureFlag(flag: FeatureFlag): FeatureFlagResult {
	// useFlagsmith returns null when FlagsmithProvider is absent (e.g. Storybook/Chromatic)
	const instance = useFlagsmith()
	const flags = useFlags([flag])
	if (!instance) return FALLBACK
	const entry = flags[flag]
	return { enabled: entry?.enabled ?? false, value: entry?.value ?? null }
}
