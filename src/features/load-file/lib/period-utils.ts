/**
 * Default file period for carga: **previous** calendar month (1-based month index).
 * January uses December of the prior year (OpenSpec mejora-sincronizacion-periodo).
 */
export function getDefaultPeriod(now: Date = new Date()): {
	month: number
	year: number
} {
	const currentMonth = now.getMonth() + 1 // 1-based (1 = January)
	const year = now.getFullYear()
	if (currentMonth === 1) {
		return { month: 12, year: year - 1 }
	}
	return { month: currentMonth - 1, year }
}
