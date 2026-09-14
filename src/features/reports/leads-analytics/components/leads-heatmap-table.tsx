'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Grid3x3 } from 'lucide-react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { HeatmapCellLeadList } from './heatmap-cell-lead-list'
import { heatmapCellStyle } from '../lib/build-report-view'
import { cellOwnerFilterFromHeatmapRow } from '../lib/cell-owner-filter'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { HeatmapRow, LeadsAnalyticsReport } from '../types/leads-analytics.types'

interface LeadsHeatmapTableProps {
	readonly state: AsyncState<LeadsAnalyticsReport>
}

const CARD_BG = 'hsl(var(--card))'
const STICKY_FIRST_COL_SHADOW = `2px 0 6px -2px rgba(0, 0, 0, 0.12), 0 1px 0 0 hsl(var(--border))`

const STICKY_CORNER_STYLE = {
	position: 'sticky' as const,
	top: 0,
	left: 0,
	zIndex: 30,
	backgroundColor: CARD_BG,
	boxShadow: STICKY_FIRST_COL_SHADOW,
}

const STICKY_COL_HEADER_STYLE = {
	position: 'sticky' as const,
	top: 0,
	zIndex: 20,
	backgroundColor: CARD_BG,
}

const STICKY_FIRST_COL_STYLE = {
	position: 'sticky' as const,
	left: 0,
	zIndex: 10,
	backgroundColor: CARD_BG,
	boxShadow: '2px 0 6px -2px rgba(0, 0, 0, 0.12)',
}

function rowExpandKey(row: HeatmapRow): string {
	return String(row.idUser ?? 'none')
}

/**
 * Money Strategist × follow-up heatmap. Chevron expands lead detail per column.
 */
export function LeadsHeatmapTable({ state }: LeadsHeatmapTableProps) {
	const [expandedOwners, setExpandedOwners] = useState<ReadonlySet<string>>(
		new Set()
	)
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const heatmap =
		state.status === 'success'
			? state.data.heatmap
			: { columns: [], rows: [], maxCellCount: 0 }

	const toggleRow = (row: HeatmapRow) => {
		const key = rowExpandKey(row)
		setExpandedOwners((prev) => {
			const next = new Set(prev)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			return next
		})
	}

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="px-4 pb-2 pt-3">
				<CardTitle className="text-sm font-semibold">
					{LEADS_ANALYTICS_UI.HEATMAP_TITLE}
				</CardTitle>
			</CardHeader>
			<CardContent className="px-0 pb-0">
				{state.status === 'error' ? (
					<p className="px-4 pb-4 text-xs text-destructive" role="alert">
						{state.error}
					</p>
				) : null}

				{isLoading ? (
					<div className="space-y-2 px-4 pb-4" aria-busy="true">
						<div className="h-8 animate-pulse rounded bg-muted" />
						<div className="h-8 animate-pulse rounded bg-muted" />
						<div className="h-8 animate-pulse rounded bg-muted" />
					</div>
				) : null}

				{!isLoading && heatmap.rows.length === 0 && state.status !== 'error' ? (
					<EmptyState
						className="py-10"
						icon={<Grid3x3 className="h-8 w-8 opacity-40" />}
						title={LEADS_ANALYTICS_UI.HEATMAP_EMPTY}
					/>
				) : null}

				{heatmap.rows.length > 0 ? (
					<div className="relative isolate max-h-[28rem] overflow-auto">
						<table className="w-full min-w-[40rem] border-separate border-spacing-0 text-left text-xs">
							<thead>
								<tr>
									<th
										className="min-w-[12rem] whitespace-nowrap border-b border-border px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
										style={STICKY_CORNER_STYLE}
									>
										{LEADS_ANALYTICS_UI.HEATMAP_OWNER_COLUMN}
									</th>
									{heatmap.columns.map((column) => (
										<th
											key={column.idLeadFunnelColumn}
											className="min-w-[6.5rem] max-w-[9rem] border-b border-border px-3 py-2.5 text-right align-bottom text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground"
											style={STICKY_COL_HEADER_STYLE}
										>
											{column.name}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{heatmap.rows.map((row) => {
									const ownerKey = rowExpandKey(row)
									const expandableIndexes = row.cells
										.map((count, index) => ({ count, index }))
										.filter((cell) => cell.count > 0)
									const isExpanded = expandedOwners.has(ownerKey)
									const colSpan = 1 + heatmap.columns.length

									return (
										<Fragment key={ownerKey}>
											<tr>
												<th
													scope="row"
													className="whitespace-nowrap border-b border-border bg-card px-3 py-2.5 font-medium text-foreground"
													style={STICKY_FIRST_COL_STYLE}
												>
													<div className="flex items-center gap-1.5">
														<button
															type="button"
															onClick={() => toggleRow(row)}
															disabled={expandableIndexes.length === 0}
															aria-expanded={isExpanded}
															aria-label={
																isExpanded
																	? LEADS_ANALYTICS_UI.COLLAPSE_OWNER
																	: LEADS_ANALYTICS_UI.EXPAND_OWNER
															}
															className="shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-muted/40 disabled:cursor-default disabled:opacity-30"
														>
															{isExpanded ? (
																<ChevronDown className="size-3.5" />
															) : (
																<ChevronRight className="size-3.5" />
															)}
														</button>
														<span>{row.ownerName}</span>
													</div>
												</th>
												{row.cells.map((count, index) => {
													const column = heatmap.columns[index]
													const style = heatmapCellStyle(
														count,
														heatmap.maxCellCount
													)
													return (
														<td
															key={`${ownerKey}-${column.idLeadFunnelColumn}`}
															className="border-b border-border px-3 py-2.5 text-right tabular-nums"
															style={style}
														>
															{count > 0 ? count : '—'}
														</td>
													)
												})}
											</tr>
											{isExpanded ? (
												<tr>
													<td
														colSpan={colSpan}
														className="border-b border-border bg-muted/10 p-0"
													>
														<div className="divide-y divide-border">
															{expandableIndexes.map(({ index }) => {
																const column = heatmap.columns[index]
																return (
																	<HeatmapCellLeadList
																		key={`${ownerKey}-${column.idLeadFunnelColumn}`}
																		idLeadFunnelColumn={
																			column.idLeadFunnelColumn
																		}
																		ownerFilter={cellOwnerFilterFromHeatmapRow(
																			row.idUser
																		)}
																		columnName={column.name}
																	/>
																)
															})}
														</div>
													</td>
												</tr>
											) : null}
										</Fragment>
									)
								})}
							</tbody>
						</table>
					</div>
				) : null}
			</CardContent>
		</Card>
	)
}
