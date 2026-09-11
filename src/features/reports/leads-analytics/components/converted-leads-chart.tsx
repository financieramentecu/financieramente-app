'use client'

import { useState } from 'react'
import { Briefcase, ChevronDown, ChevronRight } from 'lucide-react'
import type { LeadOutcomeStatus } from '@/features/leads/types/lead.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { HeatmapCellLeadList } from './heatmap-cell-lead-list'
import { barWidthPercent } from '../lib/build-report-view'
import { CELL_OWNER_SENTINEL } from '../lib/cell-owner-filter'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { LeadsAnalyticsReport } from '../types/leads-analytics.types'

const OUTCOME_BAR_CLASS: Record<LeadOutcomeStatus, string> = {
	OPEN: 'bg-sky-600',
	WON: 'bg-emerald-600',
	LOST: 'bg-red-600',
	ABANDONED: 'bg-slate-500',
}

const CONVERTED_EXPAND_KEY = {
	ALL: 'all',
} as const

type ConvertedExpandKey =
	| typeof CONVERTED_EXPAND_KEY.ALL
	| LeadOutcomeStatus

interface ConvertedLeadsChartProps {
	readonly state: AsyncState<LeadsAnalyticsReport>
}

/**
 * Total leads with a created business, broken down by outcome status.
 * Each bar expands into the lead list with a link to the related business.
 */
export function ConvertedLeadsChart({ state }: ConvertedLeadsChartProps) {
	const [expandedKey, setExpandedKey] = useState<ConvertedExpandKey | null>(
		null
	)
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const converted =
		state.status === 'success' ? state.data.converted : { total: 0, slices: [] }
	const maxCount = converted.slices.reduce(
		(max, slice) => Math.max(max, slice.count),
		0
	)

	const toggle = (key: ConvertedExpandKey) => {
		setExpandedKey((current) => (current === key ? null : key))
	}

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
						{converted.total > 0 ? (
							<button
								type="button"
								onClick={() => toggle(CONVERTED_EXPAND_KEY.ALL)}
								aria-expanded={expandedKey === CONVERTED_EXPAND_KEY.ALL}
								aria-label={
									expandedKey === CONVERTED_EXPAND_KEY.ALL
										? LEADS_ANALYTICS_UI.COLLAPSE_CONVERTED
										: LEADS_ANALYTICS_UI.EXPAND_CONVERTED
								}
								className="flex w-full items-baseline gap-2 text-left"
							>
								<span className="flex items-center gap-1 text-2xl font-bold tabular-nums text-foreground">
									{expandedKey === CONVERTED_EXPAND_KEY.ALL ? (
										<ChevronDown className="size-4 text-muted-foreground" />
									) : (
										<ChevronRight className="size-4 text-muted-foreground" />
									)}
									{converted.total}
								</span>
								<span className="text-xs font-medium text-muted-foreground">
									{LEADS_ANALYTICS_UI.CONVERTED_TOTAL}
								</span>
							</button>
						) : (
							<p className="text-2xl font-bold tabular-nums text-foreground">
								{converted.total}
								<span className="ml-2 text-xs font-medium text-muted-foreground">
									{LEADS_ANALYTICS_UI.CONVERTED_TOTAL}
								</span>
							</p>
						)}

						{expandedKey === CONVERTED_EXPAND_KEY.ALL ? (
							<HeatmapCellLeadList
								idLeadFunnelColumn={null}
								ownerFilter={CELL_OWNER_SENTINEL.ALL}
								columnName={LEADS_ANALYTICS_UI.CONVERTED_TITLE}
								withBusiness
							/>
						) : null}

						{converted.slices.length === 0 ? (
							<EmptyState
								className="py-6"
								icon={<Briefcase className="h-8 w-8 opacity-40" />}
								title={LEADS_ANALYTICS_UI.CONVERTED_EMPTY}
							/>
						) : (
							converted.slices.map((slice) => {
								const isExpanded = expandedKey === slice.outcomeStatus
								return (
									<div key={slice.outcomeStatus} className="space-y-1">
										<button
											type="button"
											onClick={() => toggle(slice.outcomeStatus)}
											aria-expanded={isExpanded}
											aria-label={
												isExpanded
													? `${LEADS_ANALYTICS_UI.COLLAPSE_CONVERTED}: ${slice.label}`
													: `${LEADS_ANALYTICS_UI.EXPAND_CONVERTED}: ${slice.label}`
											}
											className="flex w-full items-center justify-between text-left text-xs"
										>
											<span className="flex items-center gap-1 font-medium text-foreground">
												{isExpanded ? (
													<ChevronDown className="size-3.5 text-muted-foreground" />
												) : (
													<ChevronRight className="size-3.5 text-muted-foreground" />
												)}
												{slice.label}
											</span>
											<span className="tabular-nums text-muted-foreground">
												{slice.count}{' '}
												{slice.count === 1
													? LEADS_ANALYTICS_UI.LEADS_SINGULAR
													: LEADS_ANALYTICS_UI.LEADS_PLURAL}
											</span>
										</button>
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
										{isExpanded ? (
											<HeatmapCellLeadList
												idLeadFunnelColumn={null}
												ownerFilter={CELL_OWNER_SENTINEL.ALL}
												columnName={slice.label}
												withBusiness
												outcomeStatus={slice.outcomeStatus}
											/>
										) : null}
									</div>
								)
							})
						)}
					</>
				)}
			</CardContent>
		</Card>
	)
}
