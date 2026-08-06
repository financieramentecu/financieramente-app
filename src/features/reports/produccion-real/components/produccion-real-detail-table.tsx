'use client'

import { useEffect, useRef } from 'react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { formatReportMoney } from '../lib/format-report-money'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'
import { displayCurrencyForMode } from '../lib/currency-conversion'
import { useProduccionRealFilter } from './produccion-real-filter-context'
import type { ProduccionRealDetailData } from '../hooks/use-produccion-real-detail'

interface ProduccionRealDetailTableProps {
	readonly state: AsyncState<ProduccionRealDetailData>
	readonly loadMore: () => void
	readonly isLoadingMore: boolean
}

/**
 * Continuous-scroll detail table (IntersectionObserver on sentinel).
 */
export function ProduccionRealDetailTable({
	state,
	loadMore,
	isLoadingMore,
}: ProduccionRealDetailTableProps) {
	const { applied } = useProduccionRealFilter()
	const { selectedUserIds } = useHierarchySelection()
	const scrollContainerRef = useRef<HTMLDivElement | null>(null)
	const sentinelRef = useRef<HTMLDivElement | null>(null)
	const loadMoreRef = useRef(loadMore)
	loadMoreRef.current = loadMore

	const displayCurrency = displayCurrencyForMode(applied.currencyMode)
	const rows = state.status === 'success' ? state.data.rows : []
	const hasMore = state.status === 'success' ? state.data.hasMore : false
	const isInitialLoading = state.status === 'loading' || state.status === 'idle'

	useEffect(() => {
		const root = scrollContainerRef.current
		const node = sentinelRef.current
		if (!root || !node || !hasMore) return

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					loadMoreRef.current()
				}
			},
			{ root, rootMargin: '80px', threshold: 0 }
		)

		observer.observe(node)
		return () => observer.disconnect()
	}, [hasMore, rows.length])

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="pb-2 pt-3 px-4">
				<CardTitle className="text-sm font-semibold">
					{PRODUCCION_REAL_UI.DETAIL_TITLE}
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
						{PRODUCCION_REAL_UI.EMPTY_HIERARCHY}
					</p>
				) : null}

				<div ref={scrollContainerRef} className="max-h-[28rem] overflow-auto">
					<table className="w-full min-w-[64rem] text-left text-xs">
						<thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
							<tr className="border-b border-border">
								<th className="px-3 py-2 font-semibold">
									{PRODUCCION_REAL_UI.COLUMN_CREATED}
								</th>
								<th className="px-3 py-2 font-semibold">
									{PRODUCCION_REAL_UI.COLUMN_CLIENT}
								</th>
								<th className="px-3 py-2 font-semibold">
									{PRODUCCION_REAL_UI.COLUMN_AGENT}
								</th>
								<th className="px-3 py-2 font-semibold">
									{PRODUCCION_REAL_UI.COLUMN_COMPANY}
								</th>
								<th className="px-3 py-2 font-semibold">
									{PRODUCCION_REAL_UI.COLUMN_PRODUCT}
								</th>
								<th className="px-3 py-2 font-semibold">
									{PRODUCCION_REAL_UI.COLUMN_TYPE}
								</th>
								<th className="px-3 py-2 font-semibold">
									{PRODUCCION_REAL_UI.COLUMN_STATUS}
								</th>
								<th className="px-3 py-2 font-semibold text-right">
									{PRODUCCION_REAL_UI.COLUMN_VALUE}
								</th>
								<th className="px-3 py-2 font-semibold">
									{PRODUCCION_REAL_UI.COLUMN_ISSUED}
								</th>
								<th className="px-3 py-2 font-semibold">
									{PRODUCCION_REAL_UI.COLUMN_ANCHORED}
								</th>
							</tr>
						</thead>
						<tbody>
							{isInitialLoading ? (
								<tr>
									<td
										colSpan={10}
										className="px-3 py-6 text-center text-muted-foreground"
									>
										{PRODUCCION_REAL_UI.LOADING}
									</td>
								</tr>
							) : null}

							{!isInitialLoading &&
							selectedUserIds.length > 0 &&
							rows.length === 0 ? (
								<tr>
									<td
										colSpan={10}
										className="px-3 py-6 text-center text-muted-foreground"
									>
										{PRODUCCION_REAL_UI.EMPTY_TABLE}
									</td>
								</tr>
							) : null}

							{rows.map((row) => (
								<tr
									key={row.idBusiness}
									className="border-b border-border/60 hover:bg-muted/40"
								>
									<td className="px-3 py-2 whitespace-nowrap">
										{row.createdAtLabel}
									</td>
									<td className="px-3 py-2">{row.clientName}</td>
									<td className="px-3 py-2">{row.agentName}</td>
									<td className="px-3 py-2">{row.companyName}</td>
									<td className="px-3 py-2">{row.productName}</td>
									<td className="px-3 py-2">{row.contributionTypeLabel}</td>
									<td className="px-3 py-2">{row.status ?? '—'}</td>
									<td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
										{formatReportMoney(row.value, displayCurrency)}
									</td>
									<td className="px-3 py-2 whitespace-nowrap">
										{row.dateIssuedLabel || '—'}
									</td>
									<td className="px-3 py-2 whitespace-nowrap">
										{row.dateAnchoredLabel || '—'}
									</td>
								</tr>
							))}
						</tbody>
					</table>

					<div ref={sentinelRef} className="h-8" aria-hidden />

					{isLoadingMore ? (
						<p className="px-3 py-2 text-center text-xs text-muted-foreground">
							{PRODUCCION_REAL_UI.LOAD_MORE}
						</p>
					) : null}
				</div>
			</CardContent>
		</Card>
	)
}
