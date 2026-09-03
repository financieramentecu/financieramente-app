'use client'

import { useEffect, useRef } from 'react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { BusinessStatusBadge } from '@/features/negocios/components/ui/BusinessStatusBadge'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { formatAbaMfundMoney } from '../lib/format-aba-mfund-money'
import { ABA_MFUND_UI } from '../lib/ui-copy'
import type { AbaMfundDetailData } from '../types/aba-mfund.types'

const DETAIL_COL_SPAN = 7

interface AbaMfundDetailTableProps {
	readonly state: AsyncState<AbaMfundDetailData>
	readonly loadMore: () => void
	readonly isLoadingMore: boolean
}

/**
 * Continuous-scroll detail table (IntersectionObserver on sentinel).
 * Seven HU columns; Cliente is Nombre Apellido from the mapper.
 */
export function AbaMfundDetailTable({
	state,
	loadMore,
	isLoadingMore,
}: AbaMfundDetailTableProps) {
	const { selectedUserIds } = useHierarchySelection()
	const scrollContainerRef = useRef<HTMLDivElement | null>(null)
	const sentinelRef = useRef<HTMLDivElement | null>(null)
	const loadMoreRef = useRef(loadMore)
	loadMoreRef.current = loadMore

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
					{ABA_MFUND_UI.DETAIL_TITLE}
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

				<div ref={scrollContainerRef} className="max-h-[28rem] overflow-auto">
					<table className="w-full min-w-[52rem] text-left text-xs">
						<thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
							<tr>
								<th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">
									{ABA_MFUND_UI.COLUMN_CREATED}
								</th>
								<th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">
									{ABA_MFUND_UI.COLUMN_CLIENT}
								</th>
								<th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">
									{ABA_MFUND_UI.COLUMN_PERIODICITY}
								</th>
								<th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">
									{ABA_MFUND_UI.COLUMN_STATUS}
								</th>
								<th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-[11px] text-muted-foreground text-right">
									{ABA_MFUND_UI.COLUMN_VALUE}
								</th>
								<th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">
									{ABA_MFUND_UI.COLUMN_ISSUED}
								</th>
								<th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-[11px] text-muted-foreground">
									{ABA_MFUND_UI.COLUMN_ANCHORED}
								</th>
							</tr>
						</thead>
						<tbody>
							{isInitialLoading ? (
								<tr>
									<td
										colSpan={DETAIL_COL_SPAN}
										className="px-3 py-6 text-center text-muted-foreground"
									>
										{ABA_MFUND_UI.LOADING}
									</td>
								</tr>
							) : null}

							{!isInitialLoading &&
							selectedUserIds.length > 0 &&
							rows.length === 0 ? (
								<tr>
									<td
										colSpan={DETAIL_COL_SPAN}
										className="px-3 py-6 text-center text-muted-foreground"
									>
										{ABA_MFUND_UI.EMPTY_TABLE}
									</td>
								</tr>
							) : null}

							{rows.map((row, index) => (
								<tr
									key={row.idBusiness}
									className={`border-b border-border/60 transition-colors hover:bg-muted/60 ${
										index % 2 === 1 ? 'bg-muted/25' : ''
									}`}
								>
									<td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
										{row.createdAtLabel}
									</td>
									<td className="px-3 py-2.5 font-semibold text-foreground">
										{row.clientName}
									</td>
									<td className="px-3 py-2.5">{row.periodicityName}</td>
									<td className="px-3 py-2.5">
										{row.status ? (
											<BusinessStatusBadge
												status={row.status}
												className="text-[11px]"
											/>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</td>
									<td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap font-bold text-sm text-foreground">
										{formatAbaMfundMoney(row.value)}
									</td>
									<td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
										{row.dateIssuedLabel || '—'}
									</td>
									<td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
										{row.dateAnchoredLabel || '—'}
									</td>
								</tr>
							))}
						</tbody>
					</table>

					<div ref={sentinelRef} className="h-8" aria-hidden />

					{isLoadingMore ? (
						<p className="px-3 py-2 text-center text-xs text-muted-foreground">
							{ABA_MFUND_UI.LOAD_MORE}
						</p>
					) : null}
				</div>
			</CardContent>
		</Card>
	)
}
