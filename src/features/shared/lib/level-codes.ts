/**
 * Level codes with special meaning for the partner profile (COM-41).
 * `PARTNER_EXTERNAL` sits outside the LEVEL_0..GENERAL_LEVEL hierarchy chain.
 */
export const PARTNER_EXTERNAL_LEVEL_CODE = 'PARTNER_EXTERNAL'

/**
 * Hierarchy levels a user may hold to be the leader of an external partner.
 * Excludes LEVEL_0, GENERAL_LEVEL and PARTNER_EXTERNAL.
 */
export const PARTNER_LEADER_LEVEL_CODES: readonly string[] = [
	'LEVEL_1',
	'LEVEL_2',
	'LEVEL_3',
	'LEVEL_4',
	'LEVEL_5',
]

/**
 * Whether businesses configured under this level are excluded from
 * commission distribution (pre-liquidation).
 */
export function isDistributionExcludedLevel(
	levelCode: string | null | undefined
): boolean {
	return levelCode === PARTNER_EXTERNAL_LEVEL_CODE
}

/**
 * Whether the level may be held by the leader of an external partner.
 */
export function isPartnerLeaderLevel(
	levelCode: string | null | undefined
): boolean {
	return !!levelCode && PARTNER_LEADER_LEVEL_CODES.includes(levelCode)
}

/**
 * Removes PARTNER_EXTERNAL from any level list shown in a picker
 * (calculadora, leader candidates, admin level choices). LVL-01.
 */
export function excludePartnerExternalLevel<
	T extends { readonly code: string },
>(levels: readonly T[]): T[] {
	return levels.filter((level) => !isDistributionExcludedLevel(level.code))
}
