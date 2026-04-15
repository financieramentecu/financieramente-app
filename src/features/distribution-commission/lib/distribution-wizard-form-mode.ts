import type { CommissionRule } from '../types/commission-rule.types'

/**
 * Creating a product configuration seeds an active ProductPercentageCommission with
 * no category lines. The distribution wizard must update that row instead of POSTing
 * a second rule (the API rejects a second active rule).
 */
export function findActiveRulePendingDistribution(
	rules: readonly CommissionRule[]
): CommissionRule | undefined {
	return rules.find((r) => r.active && r.categories.length === 0)
}
