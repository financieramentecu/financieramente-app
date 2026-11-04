import { isDistributionExcludedLevel } from '@/features/shared/lib/level-codes'

export interface DistributionLevel {
	readonly levelCode: string | null
	readonly isDistributionExcluded: boolean
}

/**
 * Resolves a level code ONCE into the code plus whether businesses at that
 * level are excluded from commission distribution. Callers keep the result
 * instead of recomputing the boolean around a later change of owner.
 */
export function resolveDistributionLevel(
	levelCode: string | null | undefined
): DistributionLevel {
	const normalized = levelCode ?? null
	return {
		levelCode: normalized,
		isDistributionExcluded: isDistributionExcludedLevel(normalized),
	}
}
