import { TZDate } from '@date-fns/tz'

/** Single timezone shared by every business-date filter across features. */
export const BOGOTA_TZ = 'America/Bogota'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

function assertIsoDay(label: string, value: string): void {
	if (!ISO_DAY.test(value)) {
		throw new Error(`${label} debe ser YYYY-MM-DD`)
	}
}

/**
 * Convierte un par de fechas civiles (inicio/fin) en un rango UTC inclusivo:
 * desde 00:00:00.000 hasta 23:59:59.999 en Bogotá.
 */
export function parseBogotaInclusiveUtcRange(
	dateFrom: string,
	dateTo: string
): { gte: Date; lte: Date } {
	assertIsoDay('dateFrom', dateFrom)
	assertIsoDay('dateTo', dateTo)

	const [yf, mf, df] = dateFrom.split('-').map(Number)
	const [yt, mt, dt] = dateTo.split('-').map(Number)

	const startLocal = new TZDate(yf, mf - 1, df, 0, 0, 0, 0, BOGOTA_TZ)
	const endLocal = new TZDate(yt, mt - 1, dt, 23, 59, 59, 999, BOGOTA_TZ)

	const gte = new Date(startLocal.getTime())
	const lte = new Date(endLocal.getTime())

	if (gte.getTime() > lte.getTime()) {
		throw new Error('dateFrom no puede ser posterior a dateTo')
	}

	return { gte, lte }
}

/**
 * Rango UTC inclusivo del mes calendario actual en Bogotá, calculado con
 * `TZDate` (nunca con `Date` nativo en UTC) para evitar el desfase de ±1 día
 * cerca de los límites del mes.
 */
export function currentBogotaMonthRange(now: Date = new Date()): {
	gte: Date
	lte: Date
} {
	const bogotaNow = new TZDate(now, BOGOTA_TZ)
	const year = bogotaNow.getFullYear()
	const month = bogotaNow.getMonth() // 0-indexed, tz-aware accessor

	// Pure UTC calendar arithmetic (day 0 of next month = last day of this
	// month) — no local-timezone-dependent `Date` accessors involved.
	const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

	const monthStr = String(month + 1).padStart(2, '0')
	const dateFrom = `${year}-${monthStr}-01`
	const dateTo = `${year}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`

	return parseBogotaInclusiveUtcRange(dateFrom, dateTo)
}
