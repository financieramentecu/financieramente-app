'use client'

import { useState } from 'react'
import { BarChart3, ChevronDown, ChevronRight } from 'lucide-react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { HeatmapCellLeadList } from './heatmap-cell-lead-list'
import { barWidthPercent } from '../lib/build-report-view'
import { CELL_OWNER_SENTINEL } from '../lib/cell-owner-filter'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { LeadsAnalyticsReport } from '../types/leads-analytics.types'

interface FollowUpStatusBarsProps {
	readonly state: AsyncState<LeadsAnalyticsReport>
}

/**
 * Horizontal bars of follow-up statuses that have at least one lead.
 */
export function FollowUpStatusBars({ state }: FollowUpStatusBarsProps) {
	const [expandedColumnId, setExpandedColumnId] = useState<number | null>(null)
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const bars = state.status === 'success' ? state.data.followUpBars : []
	const maxCount = bars.reduce((max, bar) => Math.max(max, bar.count), 0)

	const toggleBar = (idLeadFunnelColumn: number) => {
		setExpandedColumnId((current) =>
			current === idLeadFunnelColumn ? null : idLeadFunnelColumn
		)
	}

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="px-4 pb-2 pt-3">
				<CardTitle className="text-sm font-semibold">
					{LEADS_ANALYTICS_UI.FOLLOW_UP_TITLE}
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
						<div className="h-8 animate-pulse rounded bg-muted" />
					</div>
				) : null}

				{!isLoading && bars.length === 0 && state.status !== 'error' ? (
					<EmptyState
						className="py-8"
						icon={<BarChart3 className="h-8 w-8 opacity-40" />}
						title={LEADS_ANALYTICS_UI.FOLLOW_UP_EMPTY}
					/>
				) : null}

				{bars.map((bar) => {
					const isExpanded = expandedColumnId === bar.idLeadFunnelColumn
					return (
						<div key={bar.idLeadFunnelColumn} className="space-y-1">
							<button
								type="button"
								onClick={() => toggleBar(bar.idLeadFunnelColumn)}
								aria-expanded={isExpanded}
								aria-label={
									isExpanded
										? LEADS_ANALYTICS_UI.COLLAPSE_FUNNEL
										: LEADS_ANALYTICS_UI.EXPAND_FUNNEL
								}
								className="flex w-full items-center justify-between text-left text-xs"
							>
								<span className="flex items-center gap-1 font-medium text-foreground">
									{isExpanded ? (
										<ChevronDown className="size-3.5 text-muted-foreground" />
									) : (
										<ChevronRight className="size-3.5 text-muted-foreground" />
									)}
									{bar.name}
								</span>
								<span className="tabular-nums text-muted-foreground">
									{bar.count}{' '}
									{bar.count === 1
										? LEADS_ANALYTICS_UI.LEADS_SINGULAR
										: LEADS_ANALYTICS_UI.LEADS_PLURAL}
								</span>
							</button>
							<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-[#003c45] transition-all duration-300"
									style={{ width: `${barWidthPercent(bar.count, maxCount)}%` }}
									role="progressbar"
									aria-valuenow={bar.count}
									aria-valuemin={0}
									aria-valuemax={maxCount}
									aria-label={bar.name}
								/>
							</div>
							{isExpanded ? (
								<HeatmapCellLeadList
									idLeadFunnelColumn={bar.idLeadFunnelColumn}
									ownerFilter={CELL_OWNER_SENTINEL.ALL}
									columnName={bar.name}
								/>
							) : null}
						</div>
					)
				})}
			</CardContent>
		</Card>
	)
}
