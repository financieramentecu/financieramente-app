/**
 * Calendar Date ↔ YYYY-MM-DD helpers for the filter picker.
 * Civil days from the picker use local Y/M/D; stored filters are Bogotá day strings.
 */

import { dateOnlyToBogotaNoonUtc } from '@/features/negocios/lib/bogota-date'

/**
 * Converts a stored YYYY-MM-DD filter value into a Date for MonthRangePicker.
 */
export function isoDayToPickerDate(isoDay: string): Date {
	return dateOnlyToBogotaNoonUtc(isoDay)
}

/**
 * Converts a calendar selection into YYYY-MM-DD using the picker's civil day.
 * DayPicker selects a local calendar day; local Y/M/D are the intended civil day.
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
