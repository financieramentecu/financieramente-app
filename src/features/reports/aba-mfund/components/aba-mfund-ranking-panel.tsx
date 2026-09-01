'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { HeatmapCellBusinessRow } from '@/features/production-dashboard/components/HeatmapCellBusinessRow'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { CellBusinessRowView } from '@/features/production-dashboard/types/heatmap-cell-expansion.types'
import { formatAbaMfundMoney } from '../lib/format-aba-mfund-money'
import { ABA_MFUND_UI } from '../lib/ui-copy'
import type { AbaMfundRanking, AbaMfundRankingAgent } from '../types/aba-mfund.types'

const RANKING_COL_SPAN = 3

interface AbaMfundRankingPanelProps {
	readonly state: AsyncState<AbaMfundRanking>
}

function EmbeddedBusinessesTable({
	businesses,
}: {
	readonly businesses: readonly CellBusinessRowView[]
}) {
	return (
		<div className="px-3 py-3">
			<table className="w-full border-collapse text-xs">
				<thead>
					<tr className="border-b border-border text-left text-muted-foreground">
						<th className="px-2 py-1.5 font-medium">
							{ABA_MFUND_UI.COLUMN_PRODUCT}
						</th>
						<th className="px-2 py-1.5 font-medium">
							{ABA_MFUND_UI.COLUMN_CONTRACT}
						</th>
						<th className="px-2 py-1.5 text-right font-medium">
							{ABA_MFUND_UI.COLUMN_VALUE}
						</th>
						<th className="px-2 py-1.5 font-medium">
							{ABA_MFUND_UI.COLUMN_STATUS}
						</th>
						<th className="px-2 py-1.5 text-right font-medium">
							{ABA_MFUND_UI.COLUMN_ACTION}
						</th>
					</tr>
				</thead>
				<tbody>
					{businesses.map((business) => (
						<HeatmapCellBusinessRow
							key={business.idBusiness}
							business={business}
						/>
					))}
				</tbody>
			</table>
		</div>
	)
}

function RankingAgentRow({
	agent,
	isExpanded,
	onToggle,
}: {
	readonly agent: AbaMfundRankingAgent
	readonly isExpanded: boolean
	readonly onToggle: () => void
}) {
	const canExpand = agent.businesses.length > 0

	return (
		<Fragment>
			<tr className="hover:bg-muted/30">
				<td className="px-3 py-2 text-xs border-b border-r border-border">
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={onToggle}
							disabled={!canExpand}
							aria-expanded={isExpanded}
							aria-label={
								isExpanded
									? ABA_MFUND_UI.COLLAPSE_AGENT
									: ABA_MFUND_UI.EXPAND_AGENT
							}
							title={
								isExpanded
									? ABA_MFUND_UI.COLLAPSE_AGENT
									: ABA_MFUND_UI.EXPAND_AGENT
							}
							data-testid={`aba-mfund-ranking-expand-${agent.idUser}`}
							className="shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/40 disabled:cursor-default disabled:opacity-30"
						>
							{isExpanded ? (
								<ChevronDown className="size-3.5" />
							) : (
								<ChevronRight className="size-3.5" />
							)}
						</button>
						<span className="font-medium whitespace-nowrap">
							{agent.agentName}
						</span>
					</div>
				</td>
				<td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap border-b border-border font-semibold">
					{formatAbaMfundMoney(agent.totalValue)}
				</td>
				<td className="px-3 py-2 text-right text-xs tabular-nums border-b border-border text-muted-foreground">
					{agent.businessCount}
				</td>
			</tr>
			{isExpanded ? (
				<tr data-testid={`aba-mfund-ranking-embed-${agent.idUser}`}>
					<td
						colSpan={RANKING_COL_SPAN}
						className="border-b border-border bg-muted/10 p-0"
					>
						<div className="border-l-2 border-primary/40 bg-gray-100">
							<EmbeddedBusinessesTable businesses={agent.businesses} />
						</div>
					</td>
				</tr>
			) : null}
		</Fragment>
	)
}

/**
 * Top 6 ABA por Agente with heatmap-style expand-row.
 * Multiple agents may stay expanded. Does not import HeatmapTablePanel.
 */
export function AbaMfundRankingPanel({ state }: AbaMfundRankingPanelProps) {
	const { selectedUserIds } = useHierarchySelection()
	const [expandedIds, setExpandedIds] = useState<ReadonlySet<number>>(
		new Set()
	)

	const isLoading = state.status === 'loading' || state.status === 'idle'
	const agents = state.status === 'success' ? state.data.agents : []

	const toggleAgent = (idUser: number) => {
		setExpandedIds((prev) => {
			const next = new Set(prev)
			if (next.has(idUser)) next.delete(idUser)
			else next.add(idUser)
			return next
		})
	}

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="pb-2 pt-3 px-4">
				<CardTitle className="text-sm font-semibold">
					{ABA_MFUND_UI.RANKING_TITLE}
				</CardTitle>
			</CardHeader>
			<CardContent className="px-0 pb-0">
				{state.status === 'error' ? (
					<p className="px-4 pb-4 text-xs text-destructive" role="alert">
						{state.error}
					</p>
				) : null}

				{selectedUserIds.length === 0 ? (
					<p className="px-4 pb-4 text-sm text-muted-foreground">
						{ABA_MFUND_UI.EMPTY_HIERARCHY}
					</p>
				) : null}

				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-sm">
						<thead className="bg-muted/50">
							<tr>
								<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground border-b border-r border-border">
									{ABA_MFUND_UI.COLUMN_AGENT}
								</th>
								<th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground border-b border-border">
									{ABA_MFUND_UI.COLUMN_VALUE}
								</th>
								<th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground border-b border-border">
									{ABA_MFUND_UI.COLUMN_COUNT}
								</th>
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								<tr>
									<td
										colSpan={RANKING_COL_SPAN}
										className="px-3 py-6 text-center text-muted-foreground text-xs"
									>
										{ABA_MFUND_UI.LOADING}
									</td>
								</tr>
							) : null}

							{!isLoading &&
							selectedUserIds.length > 0 &&
							agents.length === 0 ? (
								<tr>
									<td
										colSpan={RANKING_COL_SPAN}
										className="px-3 py-6 text-center text-muted-foreground text-xs"
									>
										{ABA_MFUND_UI.EMPTY_TABLE}
									</td>
								</tr>
							) : null}

							{agents.map((agent) => (
								<RankingAgentRow
									key={agent.idUser}
									agent={agent}
									isExpanded={expandedIds.has(agent.idUser)}
									onToggle={() => toggleAgent(agent.idUser)}
								/>
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	)
}
