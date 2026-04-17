/**
 * Default file period for carga: **current** calendar month (1-based month index).
 */
export function getDefaultPeriod(now: Date = new Date()): {
	month: number
	year: number
} {
	const currentMonth = now.getMonth() + 1 // 1-based (1 = January)
	const year = now.getFullYear()
	return { month: currentMonth, year }
}
