'use client'

import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { formatRatio } from '../lib/format'
import { COMMERCIAL_DASHBOARD_UI as UI } from '../lib/ui-copy'
import type { CommercialDashboardReport } from '../types/commercial-dashboard.types'

interface CommercialMsTableProps {
	readonly state: AsyncState<CommercialDashboardReport>
}

const NUMERIC = 'px-3 py-2 text-right tabular-nums'

export function CommercialMsTable({ state }: CommercialMsTableProps) {
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const rows = state.status === 'success' ? state.data.msRows : []

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="px-4 pb-2 pt-3">
				<CardTitle className="text-sm font-semibold">{UI.MS_TITLE}</CardTitle>
				<p className="text-xs text-muted-foreground">{UI.MS_SUBTITLE}</p>
			</CardHeader>
			<CardContent className="overflow-x-auto px-4 pb-4">
				{isLoading ? (
					<div className="h-32 animate-pulse rounded bg-muted" />
				) : rows.length === 0 ? (
					<EmptyState title={UI.MS_EMPTY} />
				) : (
					<table className="w-full min-w-[820px] text-sm">
						<thead>
							<tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
								<th className="px-3 py-2 text-left font-medium">{UI.COL_OWNER}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_LEADS}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_HANDLED}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_FAST}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_APPOINTMENTS}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_ATTENDANCE}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_STUCK}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_WON}</th>
								<th className={`${NUMERIC} font-medium`}>{UI.COL_CONVERSION}</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr
									key={row.idUser ?? 'unassigned'}
									className="border-b border-border last:border-0 hover:bg-muted/50"
								>
									<td className="min-w-[13rem] px-3 py-2 text-left text-foreground">{row.ownerName}</td>
									<td className={NUMERIC}>{row.leads}</td>
									<td className={NUMERIC}>
										{formatRatio(row.handled, row.leads)}
									</td>
									<td className={NUMERIC}>
										{formatRatio(row.contactedWithinHour, row.contactTimed)}
									</td>
									<td className={NUMERIC}>{row.appointments}</td>
									<td className={NUMERIC}>
										{formatRatio(row.attended, row.appointments)}
									</td>
									<td className={NUMERIC}>{row.stuck}</td>
									<td className={`${NUMERIC} text-emerald-700`}>{row.won}</td>
									<td className={NUMERIC}>{formatRatio(row.won, row.leads)}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</CardContent>
		</Card>
	)
}
