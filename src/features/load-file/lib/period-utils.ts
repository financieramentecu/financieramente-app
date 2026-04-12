export function getDefaultPeriod(now: Date = new Date()): {
	month: number
	year: number
} {
	const currentMonth = now.getMonth() + 1 // 1-based
	return { month: currentMonth, year: now.getFullYear() }
}
