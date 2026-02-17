import { Decimal } from '@prisma/client/runtime/library'

/**
 * Rounds a Decimal to 3 decimal places using ROUND_HALF_UP strategy.
 * Used for all currency calculations in the system (commissions, percentages, clawbacks).
 */
export function roundCurrency(value: Decimal | number): Decimal {
    const d = value instanceof Decimal ? value : new Decimal(value)
    return d.toDecimalPlaces(3, Decimal.ROUND_HALF_UP)
}
