'use client'

import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { formatRatio } from '../lib/format'
import { COMMERCIAL_DASHBOARD_UI as UI } from '../lib/ui-copy'
import type {
	CommercialDashboardReport,
	CommercialOriginRow,
} from '../types/commercial-dashboard.types'

interface CommercialOriginTableProps {
	readonly state: AsyncState<CommercialDashboardReport>
}

const NUMERIC = 'px-3 py-2 text-right tabular-nums'

/** Count with its share of the origin's leads: "12 · 4%". */
function withShare(part: number, total: number): string {
	return part === 0 ? '0' : `${part} · ${formatRatio(part, total)}`
}

function totalRow(rows: readonly CommercialOriginRow[]): CommercialOriginRow {
	const sum = (pick: (r: CommercialOriginRow) => number) =>
		rows.reduce((acc, r) => acc + pick(r), 0)
	return {
		origin: UI.TOTAL,
		leads: sum((r) => r.leads),
		handled: sum((r) => r.handled),
		appointments: sum((r) => r.appointments),
		attended: sum((r) => r.attended),
		proposals: sum((r) => r.proposals),
		won: sum((r) => r.won),
		lost: sum((r) => r.lost),
		abandoned: sum((r) => r.abandoned),
		withBusiness: sum((r) => r.withBusiness),
		funded: sum((r) => r.funded),
		cancelled: sum((r) => r.cancelled),
		avgDaysToWon: null,
		avgDaysToBusiness: null,
		avgDaysToFunded: null,
		fundedCop: sum((r) => r.fundedCop),
		fundedUsd: sum((r) => r.fundedUsd),
	}
}

export function CommercialOriginTable({ state }: CommercialOriginTableProps) {
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const rows = state.status === 'success' ? state.data.origins : []
	const all = rows.length > 1 ? [...rows, totalRow(rows)] : rows

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="px-4 pb-2 pt-3">
				<CardTitle className="text-sm font-semibold">{UI.ORIGINS_TITLE}</CardTitle>
				<p className="text-xs text-muted-foreground">{UI.ORIGINS_SUBTITLE}</p>
			</CardHeader>
			<CardContent className="overflow-x-auto px-4 pb-4">
				{isLoading ? (
					<div className="h-40 animate-pulse rounded bg-muted" />
				) : rows.length === 0 ? (
					<EmptyState title={UI.ORIGINS_EMPTY} />
				) : (
					<table className="w-full min-w-[900px] text-sm">
						<thead>
							<tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
								<th className="px-3 py-2 text-left font-medium">{UI.COL_ORIGIN}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_LEADS}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_HANDLED}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_APPOINTMENTS}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_ATTENDANCE}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_PROPOSAL}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_WON}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_LOST}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_ABANDONED}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_DAYS_TO_WON}</th>
							</tr>
						</thead>
						<tbody>
							{all.map((row) => (
								<tr
									key={row.origin}
									className={`border-b border-border last:border-0 hover:bg-muted/50 ${row.origin === UI.TOTAL ? 'font-semibold' : ''}`}
								>
									<td className="px-3 py-2 text-left text-foreground">{row.origin}</td>
									<td className={NUMERIC}>{row.leads}</td>
									<td className={NUMERIC}>{formatRatio(row.handled, row.leads)}</td>
									<td className={NUMERIC}>{withShare(row.appointments, row.leads)}</td>
									<td className={NUMERIC}>{withShare(row.attended, row.leads)}</td>
									<td className={NUMERIC}>{withShare(row.proposals, row.leads)}</td>
									<td className={`${NUMERIC} text-emerald-700`}>{withShare(row.won, row.leads)}</td>
									<td className={NUMERIC}>{row.lost}</td>
									<td className={NUMERIC}>{row.abandoned}</td>
									<td className={NUMERIC}>{row.avgDaysToWon ?? UI.NO_DATA}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</CardContent>
		</Card>
	)
}
