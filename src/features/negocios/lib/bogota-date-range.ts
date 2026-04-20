import { TZDate } from '@date-fns/tz'

/** Zona horaria única para filtros de fondeo en negocios (PRD). */
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

	const startLocal = new TZDate(
		yf,
		mf - 1,
		df,
		0,
		0,
		0,
		0,
		BOGOTA_TZ
	)
	const endLocal = new TZDate(
		yt,
		mt - 1,
		dt,
		23,
		59,
		59,
		999,
		BOGOTA_TZ
	)

	const gte = new Date(startLocal.getTime())
	const lte = new Date(endLocal.getTime())

	if (gte.getTime() > lte.getTime()) {
		throw new Error('dateFrom no puede ser posterior a dateTo')
	}

	return { gte, lte }
}
