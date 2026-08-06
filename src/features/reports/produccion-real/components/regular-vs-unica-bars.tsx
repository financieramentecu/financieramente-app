'use client'

import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { formatReportMoney } from '../lib/format-report-money'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'
import type { ProduccionRealKpis } from '../types/produccion-real.types'

interface RegularVsUnicaBarsProps {
	readonly state: AsyncState<ProduccionRealKpis>
}

/**
 * Proportional horizontal bars for Regular vs Única KPI totals.
 */
export function RegularVsUnicaBars({ state }: RegularVsUnicaBarsProps) {
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const kpis = state.status === 'success' ? state.data : null

	const regular = kpis?.regular.sum ?? 0
	const unico = kpis?.unico.sum ?? 0
	const total = regular + unico
	const regularPct = total > 0 ? (regular / total) * 100 : 0
	const unicoPct = total > 0 ? (unico / total) * 100 : 0

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="pb-2 pt-3 px-4">
				<CardTitle className="text-sm font-semibold">
					{PRODUCCION_REAL_UI.COMPARISON_TITLE}
				</CardTitle>
			</CardHeader>
			<CardContent className="px-4 pb-4 space-y-3">
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
						<BarRow
							label={PRODUCCION_REAL_UI.KPI_REGULAR}
							amountLabel={
								kpis
									? formatReportMoney(regular, kpis.displayCurrencyCode)
									: '—'
							}
							percent={regularPct}
							barClassName="bg-[#003c45]"
						/>
						<BarRow
							label={PRODUCCION_REAL_UI.KPI_UNICO}
							amountLabel={
								kpis
									? formatReportMoney(unico, kpis.displayCurrencyCode)
									: '—'
							}
							percent={unicoPct}
							barClassName="bg-emerald-600"
						/>
					</>
				)}
			</CardContent>
		</Card>
	)
}

interface BarRowProps {
	readonly label: string
	readonly amountLabel: string
	readonly percent: number
	readonly barClassName: string
}

function BarRow({ label, amountLabel, percent, barClassName }: BarRowProps) {
	const width = percent > 0 ? Math.max(percent, 2) : 0

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between text-xs">
				<span className="font-medium text-foreground">{label}</span>
				<span className="tabular-nums text-muted-foreground">
					{amountLabel}
				</span>
			</div>
			<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
				<div
					className={`h-full rounded-full transition-all duration-300 ${barClassName}`}
					style={{ width: `${width}%` }}
					role="progressbar"
					aria-valuenow={Math.round(percent)}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label={label}
				/>
			</div>
		</div>
	)
}
