/**
 * Computes the default period (previous month) for the file import selector.
 * Accepts an optional `now` parameter to make the function testable.
 */
export function getDefaultPeriod(now: Date = new Date()): {
	month: number
	year: number
} {
	const currentMonth = now.getMonth() + 1 // 1-based
	if (currentMonth === 1) {
		return { month: 12, year: now.getFullYear() - 1 }
	}
	return { month: currentMonth - 1, year: now.getFullYear() }
}
