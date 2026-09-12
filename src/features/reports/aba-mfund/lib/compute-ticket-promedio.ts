/**
 * Ticket promedio ABA = ABA Total sum / count, or 0 when count is 0.
 */
export function computeTicketPromedio(sum: number, count: number): number {
	if (count <= 0) return 0
	return sum / count
}
