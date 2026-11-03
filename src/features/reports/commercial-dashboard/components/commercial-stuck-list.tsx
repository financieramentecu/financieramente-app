'use client'

import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { COMMERCIAL_DASHBOARD_UI as UI } from '../lib/ui-copy'
import type { CommercialDashboardReport } from '../types/commercial-dashboard.types'

interface CommercialStuckListProps {
	readonly state: AsyncState<CommercialDashboardReport>
}

export function CommercialStuckList({ state }: CommercialStuckListProps) {
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const data = state.status === 'success' ? state.data : null
	const items = data?.stuck ?? []

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="px-4 pb-2 pt-3">
				<CardTitle className="text-sm font-semibold">{UI.STUCK_TITLE}</CardTitle>
				<p className="text-xs text-muted-foreground">{UI.STUCK_SUBTITLE}</p>
			</CardHeader>
			<CardContent className="px-4 pb-4">
				{isLoading ? (
					<div className="h-32 animate-pulse rounded bg-muted" />
				) : items.length === 0 ? (
					<EmptyState title={UI.STUCK_EMPTY} />
				) : (
					<ul className="max-h-80 divide-y divide-border overflow-y-auto pr-2">
						{items.map((item) => (
							<li
								key={item.idLead}
								className="grid grid-cols-[1fr_auto] gap-x-3 py-2 text-sm"
							>
								<span className="font-medium text-foreground">{item.name}</span>
								<span className="tabular-nums text-destructive">
									{item.daysStuck} {UI.STUCK_DAYS}
								</span>
								<span className="text-xs text-muted-foreground">
									{item.ownerName} · {item.stageName}
								</span>
							</li>
						))}
					</ul>
				)}
				{data && data.stuckTotal > items.length ? (
					<p className="mt-2 text-xs text-muted-foreground">
						{UI.STUCK_MORE} {data.stuckTotal}
					</p>
				) : null}
			</CardContent>
		</Card>
	)
}
