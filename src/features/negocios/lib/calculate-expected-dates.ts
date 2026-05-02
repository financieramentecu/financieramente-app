import { addMonths } from 'date-fns'

const MONTH_INCREMENTS: Record<string, number> = {
	Mensual: 1,
	Bimensual: 2,
	Trimestral: 3,
	Cuatrimestral: 4,
	Semestral: 6,
	Anual: 12,
}

export function calculateExpectedDates(
	anchorDate: Date,
	numAportes: number,
	periodicityName: string,
): Date[] {
	const inc = MONTH_INCREMENTS[periodicityName] ?? 0
	return Array.from({ length: numAportes }, (_, i) => addMonths(anchorDate, inc * i))
}
