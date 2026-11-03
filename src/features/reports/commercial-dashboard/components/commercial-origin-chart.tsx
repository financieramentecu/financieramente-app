'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { originColor } from '../lib/origin-colors'
import { COMMERCIAL_DASHBOARD_UI as UI } from '../lib/ui-copy'
import type { CommercialDashboardReport } from '../types/commercial-dashboard.types'

interface CommercialOriginChartProps {
	readonly state: AsyncState<CommercialDashboardReport>
}

/** "2026-10-27" → "27/10". */
function shortWeek(week: string): string {
	return `${week.slice(8, 10)}/${week.slice(5, 7)}`
}

/**
 * New leads per week, stacked by origin (CRM pipeline).
 */
export function CommercialOriginChart({ state }: CommercialOriginChartProps) {
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const points = state.status === 'success' ? state.data.weekly : []
	const originRows = state.status === 'success' ? state.data.origins : []
	const origins = originRows.map((row) => row.origin)

	const rows = [...new Set(points.map((p) => p.week))].map((week) => {
		const row: Record<string, string | number> = { week }
		for (const p of points) if (p.week === week) row[p.origin] = p.leads
		return row
	})

	return (
		<Card className="border border-border shadow-sm">
			<CardHeader className="px-4 pb-2 pt-3">
				<CardTitle className="text-sm font-semibold">{UI.WEEKLY_TITLE}</CardTitle>
				<p className="text-xs text-muted-foreground">{UI.WEEKLY_SUBTITLE}</p>
			</CardHeader>
			<CardContent className="px-4 pb-4">
				{isLoading ? (
					<div className="h-72 animate-pulse rounded bg-muted" />
				) : rows.length === 0 ? (
					<EmptyState title={UI.WEEKLY_EMPTY} />
				) : (
					<div className="h-72" role="img" aria-label={UI.WEEKLY_TITLE}>
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
								<XAxis
									dataKey="week"
									tickFormatter={shortWeek}
									tick={{ fontSize: 11, fill: '#64748b' }}
								/>
								<YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
								<Tooltip
									labelFormatter={(week) => `${UI.WEEK_OF} ${shortWeek(String(week))}`}
									contentStyle={{ fontSize: 12 }}
								/>
								<Legend wrapperStyle={{ fontSize: 11 }} />
								{origins.map((origin) => (
									<Bar
										key={origin}
										dataKey={origin}
										stackId="leads"
										fill={originColor(originRows, origin)}
									/>
								))}
							</BarChart>
						</ResponsiveContainer>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
