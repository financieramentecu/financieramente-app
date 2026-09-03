'use client'

import { Card, CardContent } from '@/features/shared/ui/card'
import { MonthRangePicker } from '@/features/production-dashboard/components/filters/MonthRangePicker'
import {
	isoDayToPickerDate,
	pickerDateToIsoDay,
} from '../lib/filter-date'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { LeadsAnalyticsDateRange } from '../types/leads-analytics.types'

interface LeadsAnalyticsFilterBarProps {
	readonly range: LeadsAnalyticsDateRange
	readonly onRangeChange: (range: LeadsAnalyticsDateRange) => void
	readonly dateRangeError?: string
}

/**
 * Date-range filter. Changes apply immediately so every chart refetches together.
 */
export function LeadsAnalyticsFilterBar({
	range,
	onRangeChange,
	dateRangeError,
}: LeadsAnalyticsFilterBarProps) {
	return (
		<Card className="border border-border bg-card shadow-sm">
			<CardContent className="space-y-2 p-3">
				<h3 className="text-xs font-semibold leading-none text-foreground">
					{LEADS_ANALYTICS_UI.FILTERS_TITLE}
				</h3>
				<div className="max-w-md">
					<MonthRangePicker
						value={{
							start: isoDayToPickerDate(range.dateFrom),
							end: isoDayToPickerDate(range.dateTo),
						}}
						onChange={(next) => {
							onRangeChange({
								dateFrom: pickerDateToIsoDay(next.start),
								dateTo: pickerDateToIsoDay(next.end),
							})
						}}
						error={dateRangeError}
					/>
				</div>
			</CardContent>
		</Card>
	)
}
