import { Decimal } from '@prisma/client/runtime/library'

export interface LineDistributionAmounts {
	readonly taxAmount: Decimal
	readonly valueCommissionWithDiscount: Decimal
	readonly clawbackAmount: Decimal
	readonly finalAmount: Decimal
}

/**
 * Per distribution line: tax discount on gross, then clawback on post-tax amount.
 */
export function computeLineDistributionAmounts(
	grossLineCommission: Decimal,
	discountPercentage: Decimal,
	clawbackPercentage: Decimal
): LineDistributionAmounts {
	const taxAmount = grossLineCommission.mul(discountPercentage)
	const valueCommissionWithDiscount = grossLineCommission.sub(taxAmount)
	const clawbackAmount = valueCommissionWithDiscount.mul(clawbackPercentage)
	const finalAmount = valueCommissionWithDiscount.sub(clawbackAmount)
	return {
		taxAmount,
		valueCommissionWithDiscount,
		clawbackAmount,
		finalAmount,
	}
}
