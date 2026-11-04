import { isDistributionExcludedLevel } from '@/features/shared/lib/level-codes'

/**
 * SettlementCommission status for rows that belong to a business excluded from
 * commission distribution (partner businesses, COM-41). `status` is a plain
 * String column, so no migration is required.
 */
export const EXCLUDED_SETTLEMENT_STATUS = 'EXCLUDED'

/**
 * Minimal business shape needed to decide the exclusion. Optional on purpose:
 * rows loaded without the PPC level are never excluded by accident.
 */
export interface DistributionExclusionBusiness {
	readonly productPercentageCommission?: {
		readonly productConfiguration?: {
			readonly level?: { readonly code?: string | null } | null
		} | null
	} | null
}

/**
 * Whether the business is excluded from distribution. Decided from the
 * configuration level of its PPC, never from the owner's current role.
 */
export function isBusinessDistributionExcluded(
	business: DistributionExclusionBusiness | null | undefined
): boolean {
	return isDistributionExcludedLevel(
		business?.productPercentageCommission?.productConfiguration?.level?.code
	)
}
