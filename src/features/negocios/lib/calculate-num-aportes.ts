const MULTIPLIERS: Record<string, number> = {
	Anual: 1,
	Semestral: 2,
	Cuatrimestral: 3,
	Trimestral: 4,
	Bimensual: 6,
	Mensual: 12,
}

export function calculateNumAportes(input: {
	termYears: number | null
	periodicityName: string | null
	companyName: string | null
	productName: string | null
}): number {
	const { termYears, periodicityName, companyName, productName } = input

	if (companyName === 'SKANDIA' && productName === 'MFUND') return 0
	if (periodicityName === 'Pago Único' || periodicityName === 'Aportes Ocasionales') return 1
	if (termYears == null || periodicityName == null) return 0

	return termYears * (MULTIPLIERS[periodicityName] ?? 0)
}
