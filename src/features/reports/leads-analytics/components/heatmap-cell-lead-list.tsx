'use client'

import { useState } from 'react'
import { useHeatmapCellLeads } from '../hooks/use-heatmap-cell-leads'
import type { CellOwnerFilter } from '../lib/cell-owner-filter'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import { HeatmapCellLeadRow } from './heatmap-cell-lead-row'
import { useLeadsAnalyticsDetail } from './leads-analytics-detail-context'

const REVEAL_STEP = 20

interface HeatmapCellLeadListProps {
	readonly idLeadFunnelColumn: number
	readonly ownerFilter: CellOwnerFilter
	readonly columnName: string
}

/**
 * Lazy lead list inside an expanded heatmap row or follow-up bar.
 */
export function HeatmapCellLeadList({
	idLeadFunnelColumn,
	ownerFilter,
	columnName,
}: HeatmapCellLeadListProps) {
	const { openLead } = useLeadsAnalyticsDetail()
	const state = useHeatmapCellLeads({
		idLeadFunnelColumn,
		ownerFilter,
		enabled: true,
	})
	const [visibleCount, setVisibleCount] = useState(REVEAL_STEP)

	if (state.status === 'loading' || state.status === 'idle') {
		return (
			<div
				role="status"
				aria-label={LEADS_ANALYTICS_UI.LOADING}
				className="px-3 py-3 text-xs text-muted-foreground"
			>
				{LEADS_ANALYTICS_UI.LOADING}
			</div>
		)
	}

	if (state.status === 'error') {
		return (
			<div role="alert" className="px-3 py-3 text-xs text-destructive">
				{state.error}
			</div>
		)
	}

	const { leads, total, isTruncated } = state.data
	const visibleLeads = leads.slice(0, visibleCount)
	const hasMore = visibleCount < leads.length

	return (
		<div className="border-l-2 border-primary/40 bg-gray-100">
			<div className="bg-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{columnName}
			</div>
			{leads.length === 0 ? (
				<p className="px-3 py-3 text-xs text-muted-foreground">
					{LEADS_ANALYTICS_UI.HEATMAP_EMPTY}
				</p>
			) : (
				<div className="px-3 py-3">
					<table className="w-full table-fixed border-collapse text-xs">
						<thead>
							<tr className="border-b border-border text-left text-muted-foreground">
								<th className="px-2 py-1.5 font-medium">
									{LEADS_ANALYTICS_UI.COLUMN_LEAD}
								</th>
								<th className="px-2 py-1.5 font-medium">
									{LEADS_ANALYTICS_UI.COLUMN_OWNER}
								</th>
								<th className="px-2 py-1.5 font-medium">
									{LEADS_ANALYTICS_UI.COLUMN_OUTCOME}
								</th>
								<th className="px-2 py-1.5 font-medium">
									{LEADS_ANALYTICS_UI.COLUMN_CREATED}
								</th>
								<th className="px-2 py-1.5 text-right font-medium">
									{LEADS_ANALYTICS_UI.COLUMN_ACTION}
								</th>
							</tr>
						</thead>
						<tbody>
							{visibleLeads.map((lead) => (
								<HeatmapCellLeadRow
									key={lead.idLead}
									lead={lead}
									onViewLead={openLead}
								/>
							))}
						</tbody>
					</table>
					{hasMore ? (
						<div className="mt-2 flex justify-center">
							<button
								type="button"
								onClick={() =>
									setVisibleCount((count) => count + REVEAL_STEP)
								}
								className="rounded-md border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40"
							>
								{LEADS_ANALYTICS_UI.SEE_MORE} ({leads.length - visibleCount}{' '}
								{LEADS_ANALYTICS_UI.REMAINING})
							</button>
						</div>
					) : null}
					<p className="mt-2 text-[10px] text-muted-foreground">
						{leads.length} {LEADS_ANALYTICS_UI.COUNT_OF} {total}{' '}
						{LEADS_ANALYTICS_UI.LEADS_PLURAL}
						{isTruncated ? LEADS_ANALYTICS_UI.TRUNCATED_HINT : ''}
					</p>
				</div>
			)}
		</div>
	)
}
