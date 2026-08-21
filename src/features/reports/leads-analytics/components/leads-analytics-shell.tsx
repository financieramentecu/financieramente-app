'use client'

import { useState } from 'react'
import { FollowUpStatusBars } from './follow-up-status-bars'
import { ConvertedLeadsChart } from './converted-leads-chart'
import { LeadsAnalyticsFilterBar } from './leads-analytics-filter-bar'
import { LeadsHeatmapTable } from './leads-heatmap-table'
import { useLeadsAnalyticsReport } from '../hooks/use-leads-analytics-report'
import {
	currentBogotaMonthDateStrings,
	isIsoDateRangeValid,
} from '../lib/filter-date'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { LeadsAnalyticsDateRange } from '../types/leads-analytics.types'

function ShellContent() {
	const [range, setRange] = useState<LeadsAnalyticsDateRange>(
		currentBogotaMonthDateStrings
	)
	const rangeValid = isIsoDateRangeValid(range.dateFrom, range.dateTo)
	const { state } = useLeadsAnalyticsReport(range, rangeValid)

	return (
		<main className="flex-1 space-y-4 overflow-y-auto p-6">
			<header>
				<h1 className="text-lg font-semibold text-foreground">
					{LEADS_ANALYTICS_UI.PAGE_TITLE}
				</h1>
				<p className="text-xs text-muted-foreground">
					{LEADS_ANALYTICS_UI.PAGE_SUBTITLE}
				</p>
			</header>

			<LeadsAnalyticsFilterBar
				range={range}
				onRangeChange={setRange}
				dateRangeError={rangeValid ? undefined : LEADS_ANALYTICS_UI.ERROR_DATE_RANGE}
			/>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<FollowUpStatusBars state={state} />
				<ConvertedLeadsChart state={state} />
			</div>

			<LeadsHeatmapTable state={state} />
		</main>
	)
}

/**
 * Client shell for the Leads Analytics report.
 */
export function LeadsAnalyticsShell() {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<ShellContent />
		</div>
	)
}
