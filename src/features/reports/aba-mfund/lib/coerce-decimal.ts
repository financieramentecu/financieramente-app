/**
 * Coerces Prisma Decimal / number / null to a finite JS number.
 * Local copy so ABA-MFUND does not import Producción Real TRM conversion.
 */
export function coerceDecimal(raw: unknown): number {
	if (raw === null || raw === undefined) return 0
	if (typeof raw === 'object' && raw !== null && 'toNumber' in raw) {
		return (raw as { toNumber(): number }).toNumber()
	}
	const n = Number(raw)
	return Number.isFinite(n) ? n : 0
}
