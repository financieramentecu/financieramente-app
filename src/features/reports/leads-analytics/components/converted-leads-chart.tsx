'use client'

import { Briefcase } from 'lucide-react'
import type { LeadOutcomeStatus } from '@/features/leads/types/lead.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { barWidthPercent } from '../lib/build-report-view'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { LeadsAnalyticsReport } from '../types/leads-analytics.types'

const OUTCOME_BAR_CLASS: Record<LeadOutcomeStatus, string> = {
	OPEN: 'bg-sky-600',
	WON: 'bg-emerald-600',
	LOST: 'bg-red-600',
	ABANDONED: 'bg-slate-500',
}

interface ConvertedLeadsChartProps {
	readonly state: AsyncState<LeadsAnalyticsReport>
}

/**
 * Total leads with a created business, broken down by outcome status.
 */
export function ConvertedLeadsChart({ state }: ConvertedLeadsChartProps) {
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const converted =
		state.status === 'success' ? state.data.converted : { total: 0, slices: [] }
	const maxCount = converted.slices.reduce(
		(max, slice) => Math.max(max, slice.count),
		0
	)

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="px-4 pb-2 pt-3">
				<CardTitle className="text-sm font-semibold">
					{LEADS_ANALYTICS_UI.CONVERTED_TITLE}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 px-4 pb-4">
				{state.status === 'error' ? (
					<p className="text-xs text-destructive" role="alert">
						{state.error}
					</p>
				) : null}

				{isLoading ? (
					<div className="space-y-3" aria-busy="true">
						<div className="h-8 animate-pulse rounded bg-muted" />
						<div className="h-8 animate-pulse rounded bg-muted" />
					</div>
				) : (
					<>
						<p className="text-2xl font-bold tabular-nums text-foreground">
							{converted.total}
							<span className="ml-2 text-xs font-medium text-muted-foreground">
								{LEADS_ANALYTICS_UI.CONVERTED_TOTAL}
							</span>
						</p>

						{converted.slices.length === 0 ? (
							<EmptyState
								className="py-6"
								icon={<Briefcase className="h-8 w-8 opacity-40" />}
								title={LEADS_ANALYTICS_UI.CONVERTED_EMPTY}
							/>
						) : (
							converted.slices.map((slice) => (
								<div key={slice.outcomeStatus} className="space-y-1">
									<div className="flex items-center justify-between text-xs">
										<span className="font-medium text-foreground">
											{slice.label}
										</span>
										<span className="tabular-nums text-muted-foreground">
											{slice.count}{' '}
											{slice.count === 1
												? LEADS_ANALYTICS_UI.LEADS_SINGULAR
												: LEADS_ANALYTICS_UI.LEADS_PLURAL}
										</span>
									</div>
									<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
										<div
											className={`h-full rounded-full transition-all duration-300 ${OUTCOME_BAR_CLASS[slice.outcomeStatus]}`}
											style={{
												width: `${barWidthPercent(slice.count, maxCount)}%`,
											}}
											role="progressbar"
											aria-valuenow={slice.count}
											aria-valuemin={0}
											aria-valuemax={maxCount}
											aria-label={slice.label}
										/>
									</div>
								</div>
							))
						)}
					</>
				)}
			</CardContent>
		</Card>
	)
}
