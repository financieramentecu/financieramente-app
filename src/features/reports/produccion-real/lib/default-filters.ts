/**
 * Default filters for Producción Real (Bogotá current month, Todas + ALL_TRM).
 * Used by UI draft/apply/clear in batch 6.x.
 */

import { TZDate } from '@date-fns/tz'
import { BOGOTA_TZ } from '@/features/shared/lib/bogota-date-range'
import {
	CURRENCY_MODE,
	type CurrencyMode,
	type ProduccionRealContributionType,
	type ProduccionRealFilters,
} from '../types/produccion-real.types'

export interface ProduccionRealFilterDefaults {
	readonly dateFrom: string
	readonly dateTo: string
	readonly contributionTypes: readonly ProduccionRealContributionType[]
	readonly companyIds: readonly number[]
	readonly currencyMode: CurrencyMode
}

/**
 * Returns current Bogotá calendar month as YYYY-MM-DD inclusive bounds.
 */
export function currentBogotaMonthDateStrings(
	now: Date = new Date()
): { dateFrom: string; dateTo: string } {
	const bogotaNow = new TZDate(now, BOGOTA_TZ)
	const year = bogotaNow.getFullYear()
	const month = bogotaNow.getMonth()
	const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
	const monthStr = String(month + 1).padStart(2, '0')
	return {
		dateFrom: `${year}-${monthStr}-01`,
		dateTo: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
	}
}

/**
 * Spec defaults: current Bogotá month, Tipo Todas, Compañía Todas, Moneda Todas (TRM).
 * Note: `userIds` come from hierarchy selection — not part of filter defaults.
 */
export function buildDefaultProduccionRealFilters(
	now: Date = new Date()
): ProduccionRealFilterDefaults {
	const { dateFrom, dateTo } = currentBogotaMonthDateStrings(now)
	return {
		dateFrom,
		dateTo,
		contributionTypes: [],
		companyIds: [],
		currencyMode: CURRENCY_MODE.ALL_TRM,
	}
}

/**
 * Builds a full filters object once hierarchy userIds are known.
 */
export function toProduccionRealFilters(
	defaults: ProduccionRealFilterDefaults,
	userIds: readonly number[]
): ProduccionRealFilters {
	return {
		dateFrom: defaults.dateFrom,
		dateTo: defaults.dateTo,
		contributionTypes: defaults.contributionTypes,
		companyIds: defaults.companyIds,
		currencyMode: defaults.currencyMode,
		userIds,
	}
}
