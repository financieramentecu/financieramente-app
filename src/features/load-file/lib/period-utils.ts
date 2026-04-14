export function getDefaultPeriod(now: Date = new Date()): {
	month: number
	year: number
} {
	const d = new Date(now)
	d.setMonth(d.getMonth() - 1)
	return {
		month: d.getMonth() + 1,
		year: d.getFullYear(),
	}
}
