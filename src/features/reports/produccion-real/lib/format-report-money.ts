/**
 * Format monetary amounts for Producción Real KPI / detail display.
 */

import {
	DISPLAY_CURRENCY,
	type DisplayCurrencyCode,
} from '../types/produccion-real.types'

/**
 * Formats a report amount with code prefix according to display currency.
 */
export function formatReportMoney(
	value: number,
	displayCurrencyCode: DisplayCurrencyCode
): string {
	if (displayCurrencyCode === DISPLAY_CURRENCY.COP) {
		const formatted = value.toLocaleString('es-CO', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		})
		return `COP $${formatted}`
	}

	const formatted = value.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})

	if (displayCurrencyCode === DISPLAY_CURRENCY.FOREIGN) {
		return `USD ${formatted}`
	}

	return `USD ${formatted}`
}
