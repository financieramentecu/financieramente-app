/**
 * Currency conversion for Producción Real.
 * Reuses dashboard classifier convention: idCurrency === 1 ⇒ COP; else foreign-as-USD.
 *
 * Modes:
 * - ALL_TRM: USD = foreignUSD + COP / TRM
 * - FOREIGN: native foreign only (no TRM)
 * - COP: COP only (no TRM)
 */

import {
	COP_CURRENCY_ID,
	CURRENCY_MODE,
	DISPLAY_CURRENCY,
	type CurrencyMode,
	type CurrencySplit,
	type DisplayCurrencyCode,
} from '../types/produccion-real.types'

export interface ConvertedAmount {
	readonly amount: number
	readonly displayCurrencyCode: DisplayCurrencyCode
}

/**
 * Converts a COP + foreign split into a single display amount for the mode.
 */
export function convertCurrencySplit(
	split: Pick<CurrencySplit, 'totalCop' | 'totalForeignUsd'>,
	mode: CurrencyMode,
	trmRate: number | null
): ConvertedAmount {
	switch (mode) {
		case CURRENCY_MODE.FOREIGN:
			return {
				amount: split.totalForeignUsd,
				displayCurrencyCode: DISPLAY_CURRENCY.FOREIGN,
			}
		case CURRENCY_MODE.COP:
			return {
				amount: split.totalCop,
				displayCurrencyCode: DISPLAY_CURRENCY.COP,
			}
		case CURRENCY_MODE.ALL_TRM: {
			const rate = trmRate != null && trmRate > 0 ? trmRate : 0
			const nationalUsd = rate > 0 ? split.totalCop / rate : 0
			return {
				amount: nationalUsd + split.totalForeignUsd,
				displayCurrencyCode: DISPLAY_CURRENCY.USD,
			}
		}
		default: {
			const _exhaustive: never = mode
			return _exhaustive
		}
	}
}

/**
 * Converts a single business value according to its currency and active mode.
 */
export function convertBusinessValue(
	value: number,
	idCurrency: number,
	mode: CurrencyMode,
	trmRate: number | null,
	copCurrencyId: number = COP_CURRENCY_ID
): number {
	const isCop = idCurrency === copCurrencyId

	switch (mode) {
		case CURRENCY_MODE.FOREIGN:
			return isCop ? 0 : value
		case CURRENCY_MODE.COP:
			return isCop ? value : 0
		case CURRENCY_MODE.ALL_TRM: {
			if (!isCop) return value
			const rate = trmRate != null && trmRate > 0 ? trmRate : 0
			return rate > 0 ? value / rate : 0
		}
		default: {
			const _exhaustive: never = mode
			return _exhaustive
		}
	}
}

/**
 * Display currency label for UI / Excel headers given mode.
 */
export function displayCurrencyForMode(mode: CurrencyMode): DisplayCurrencyCode {
	switch (mode) {
		case CURRENCY_MODE.ALL_TRM:
			return DISPLAY_CURRENCY.USD
		case CURRENCY_MODE.FOREIGN:
			return DISPLAY_CURRENCY.FOREIGN
		case CURRENCY_MODE.COP:
			return DISPLAY_CURRENCY.COP
		default: {
			const _exhaustive: never = mode
			return _exhaustive
		}
	}
}

/**
 * Coerces Prisma Decimal / number / null to a finite JS number.
 */
export function coerceDecimal(raw: unknown): number {
	if (raw === null || raw === undefined) return 0
	if (typeof raw === 'object' && raw !== null && 'toNumber' in raw) {
		return (raw as { toNumber(): number }).toNumber()
	}
	const n = Number(raw)
	return Number.isFinite(n) ? n : 0
}
