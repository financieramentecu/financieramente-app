/**
 * Formats a COP amount for ABA-MFUND display.
 * Local clone of formatReportMoney(..., 'COP') so UI types never pull TRM.
 */
export function formatAbaMfundMoney(value: number): string {
	const formatted = value.toLocaleString('es-CO', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})
	return `COP $${formatted}`
}
