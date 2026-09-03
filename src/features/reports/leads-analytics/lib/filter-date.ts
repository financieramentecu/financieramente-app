/**
 * Calendar Date ↔ YYYY-MM-DD helpers for the Leads Analytics date picker.
 */

import { TZDate } from '@date-fns/tz'
import { dateOnlyToBogotaNoonUtc } from '@/features/negocios/lib/bogota-date'
import { BOGOTA_TZ } from '@/features/shared/lib/bogota-date-range'
import type { LeadsAnalyticsDateRange } from '../types/leads-analytics.types'

/**
 * Converts a stored YYYY-MM-DD filter value into a Date for MonthRangePicker.
 */
export function isoDayToPickerDate(isoDay: string): Date {
	return dateOnlyToBogotaNoonUtc(isoDay)
}

/**
 * Converts a calendar selection into YYYY-MM-DD using the picker's civil day.
 */
export function pickerDateToIsoDay(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function isIsoDateRangeValid(dateFrom: string, dateTo: string): boolean {
	return dateFrom <= dateTo
}

/**
 * Returns current Bogotá calendar month as YYYY-MM-DD inclusive bounds.
 */
export function currentBogotaMonthDateStrings(
	now: Date = new Date()
): LeadsAnalyticsDateRange {
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
