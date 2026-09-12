'use client'

import { Button } from '@/features/shared/ui/button'
import { Card, CardContent } from '@/features/shared/ui/card'
import { Separator } from '@/features/shared/ui/separator'
import { MonthRangePicker } from '@/features/production-dashboard/components/filters/MonthRangePicker'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import {
	LEADS_ANALYTICS_FILTER_ACTION,
	useLeadsAnalyticsFilter,
} from './leads-analytics-filter-context'
import { isoDayToPickerDate, pickerDateToIsoDay } from '../lib/filter-date'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'

/**
 * Date-range filter. Draft edits; Aplicar commits; Limpiar restores defaults.
 */
export function LeadsAnalyticsFilterBar() {
	const { draft, dispatch, isApplyEnabled, dateRangeError } =
		useLeadsAnalyticsFilter()
	const { dispatch: hierarchyDispatch } = useHierarchySelection()

	const handleClear = () => {
		dispatch({ type: LEADS_ANALYTICS_FILTER_ACTION.CLEAR })
		hierarchyDispatch({ type: 'SELECT_ALL' })
	}

	return (
		<Card className="border border-border bg-card shadow-sm">
			<CardContent className="space-y-2 p-3">
				<h3 className="text-xs font-semibold leading-none text-foreground">
					{LEADS_ANALYTICS_UI.FILTERS_TITLE}
				</h3>
				<div className="max-w-md">
					<MonthRangePicker
						value={{
							start: isoDayToPickerDate(draft.dateFrom),
							end: isoDayToPickerDate(draft.dateTo),
						}}
						onChange={(next) => {
							dispatch({
								type: LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_FROM,
								dateFrom: pickerDateToIsoDay(next.start),
							})
							dispatch({
								type: LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_TO,
								dateTo: pickerDateToIsoDay(next.end),
							})
						}}
						error={dateRangeError}
					/>
				</div>
				<Separator />
				<div className="flex flex-wrap items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 px-3 text-xs"
						onClick={handleClear}
					>
						{LEADS_ANALYTICS_UI.CLEAR}
					</Button>
					<Button
						type="button"
						size="sm"
						disabled={!isApplyEnabled}
						className="h-7 px-4 text-xs bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
						onClick={() =>
							dispatch({ type: LEADS_ANALYTICS_FILTER_ACTION.APPLY })
						}
					>
						{LEADS_ANALYTICS_UI.APPLY}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
