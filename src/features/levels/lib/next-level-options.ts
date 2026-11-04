import { excludePartnerExternalLevel } from '@/features/shared/lib/level-codes'

interface NextLevelSource {
	readonly idLevel: number
	readonly name: string
	readonly code: string
}

export interface NextLevelOption {
	readonly idLevel: number
	readonly name: string
}

/**
 * Options for the "Siguiente nivel" picker. PARTNER_EXTERNAL sits outside the
 * commission chain, so it can never be the next level of another level.
 */
export function buildNextLevelOptions(
	levels: readonly NextLevelSource[]
): NextLevelOption[] {
	return excludePartnerExternalLevel(levels).map((level) => ({
		idLevel: level.idLevel,
		name: level.name,
	}))
}
