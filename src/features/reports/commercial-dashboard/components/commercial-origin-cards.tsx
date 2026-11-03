'use client'

import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent } from '@/features/shared/ui/card'
import { formatChange, formatRatio } from '../lib/format'
import { originColor } from '../lib/origin-colors'
import { COMMERCIAL_DASHBOARD_UI as UI } from '../lib/ui-copy'
import type { CommercialDashboardReport } from '../types/commercial-dashboard.types'

interface CommercialOriginCardsProps {
	readonly state: AsyncState<CommercialDashboardReport>
}

function changeClass(change: string): string {
	if (change.startsWith('+')) return 'text-emerald-700'
	if (change.startsWith('−')) return 'text-red-700'
	return 'text-muted-foreground'
}

/**
 * One card per origin: lead volume with its change vs the previous period,
 * win and lost rates, and days to won.
 */
export function CommercialOriginCards({ state }: CommercialOriginCardsProps) {
	if (state.status === 'loading' || state.status === 'idle') {
		return <div className="h-32 animate-pulse rounded-lg bg-muted" />
	}
	if (state.status !== 'success' || state.data.origins.length === 0) return null

	const { origins, previousByOrigin } = state.data
	const previous = new Map(previousByOrigin.map((row) => [row.origin, row]))

	return (
		<section aria-label={UI.CARDS_TITLE} className="space-y-2">
			<h2 className="text-sm font-semibold text-foreground">{UI.CARDS_TITLE}</h2>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{origins.map((row) => {
					const prev = previous.get(row.origin)
					const change = prev ? formatChange(row.leads, prev.leads) : null
					return (
						<Card
							key={row.origin}
							className="border border-border shadow-sm"
							style={{ borderTop: `3px solid ${originColor(origins, row.origin)}` }}
						>
							<CardContent className="space-y-2 p-3">
								<p className="truncate text-xs font-semibold text-foreground" title={row.origin}>
									{row.origin}
								</p>
								<div className="flex items-baseline gap-2">
									<span className="text-2xl font-semibold tabular-nums text-foreground">
										{row.leads}
									</span>
									<span className="text-xs text-muted-foreground">{UI.CARD_LEADS}</span>
									{change ? (
										<span className={`ml-auto text-xs font-medium tabular-nums ${changeClass(change)}`}>
											{change}
										</span>
									) : (
										<span className="ml-auto text-[10px] text-muted-foreground">
											{UI.CARD_NO_PREVIOUS}
										</span>
									)}
								</div>
								<dl className="grid grid-cols-3 gap-1 text-center">
									<div>
										<dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
											{UI.CARD_WON_RATE}
										</dt>
										<dd className="text-sm font-semibold tabular-nums text-emerald-700">
											{formatRatio(row.won, row.leads)}
										</dd>
									</div>
									<div>
										<dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
											{UI.CARD_LOST_RATE}
										</dt>
										<dd className="text-sm font-semibold tabular-nums">
											{formatRatio(row.lost + row.abandoned, row.leads)}
										</dd>
									</div>
									<div>
										<dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
											{UI.CARD_DAYS_TO_WON}
										</dt>
										<dd className="text-sm font-semibold tabular-nums">
											{row.avgDaysToWon ?? UI.NO_DATA}
										</dd>
									</div>
								</dl>
							</CardContent>
						</Card>
					)
				})}
			</div>
		</section>
	)
}
