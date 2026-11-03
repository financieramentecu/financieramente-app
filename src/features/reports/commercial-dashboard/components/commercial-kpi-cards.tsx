'use client'

import type { AsyncState } from '@/features/shared/types/async-state.types'
import { Card, CardContent } from '@/features/shared/ui/card'
import { formatChange, formatRatio } from '../lib/format'
import { COMMERCIAL_DASHBOARD_UI as UI } from '../lib/ui-copy'
import type { CommercialDashboardReport } from '../types/commercial-dashboard.types'

interface CommercialKpiCardsProps {
	readonly state: AsyncState<CommercialDashboardReport>
}

interface KpiProps {
	readonly label: string
	readonly value: string
	readonly hint?: string
	/** Change vs the previous period, e.g. "+12%". */
	readonly change?: string | null
	readonly isLoading: boolean
}

function changeClass(change: string): string {
	if (change.startsWith('+')) return 'text-emerald-700'
	if (change.startsWith('−')) return 'text-red-700'
	return 'text-muted-foreground'
}

function Kpi({ label, value, hint, change, isLoading }: KpiProps) {
	return (
		<Card className="border border-border shadow-sm">
			<CardContent className="space-y-1 p-3">
				<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					{label}
				</p>
				{isLoading ? (
					<div className="h-7 w-16 animate-pulse rounded bg-muted" />
				) : (
					<p className="text-2xl font-semibold tabular-nums text-foreground">
						{value}
					</p>
				)}
				{hint && !isLoading ? (
					<p className="text-xs text-muted-foreground">{hint}</p>
				) : null}
				{change && !isLoading ? (
					<p className={`text-xs font-medium tabular-nums ${changeClass(change)}`}>{change}</p>
				) : null}
			</CardContent>
		</Card>
	)
}

export function CommercialKpiCards({ state }: CommercialKpiCardsProps) {
	const isLoading = state.status === 'loading' || state.status === 'idle'
	const data = state.status === 'success' ? state.data : null
	const kpis = data?.kpis ?? null
	const prev = data?.previous ?? null
	const vsPrevious = (current: number, previous: number | undefined) => {
		const change = prev && previous !== undefined ? formatChange(current, previous) : null
		return change && prev ? `${change} ${UI.VS_PREVIOUS} ${prev.dateFrom} → ${prev.dateTo}` : null
	}

	return (
		<div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
			<Kpi
				label={UI.KPI_NEW}
				value={String(kpis?.newLeads ?? 0)}
				change={vsPrevious(kpis?.newLeads ?? 0, prev?.newLeads)}
				isLoading={isLoading}
			/>
			<Kpi
				label={UI.KPI_WON}
				value={String(kpis?.won ?? 0)}
				hint={formatRatio(kpis?.won ?? 0, kpis?.newLeads ?? 0)}
				change={vsPrevious(kpis?.won ?? 0, prev?.won)}
				isLoading={isLoading}
			/>
			<Kpi
				label={UI.KPI_HANDLED}
				value={formatRatio(kpis?.handled ?? 0, kpis?.newLeads ?? 0)}
				hint={`${kpis?.handled ?? 0} / ${kpis?.newLeads ?? 0}`}
				isLoading={isLoading}
			/>
			<Kpi
				label={UI.KPI_FAST}
				value={formatRatio(kpis?.contactedWithinHour ?? null, kpis?.contactTimed ?? 0)}
				hint={`${kpis?.contactTimed ?? 0} / ${kpis?.newLeads ?? 0} ${UI.KPI_FAST_BASE}`}
				isLoading={isLoading}
			/>
			<Kpi label={UI.KPI_APPOINTMENTS} value={String(kpis?.appointments ?? 0)} isLoading={isLoading} />
			<Kpi
				label={UI.KPI_ATTENDANCE}
				value={formatRatio(kpis?.attended ?? 0, kpis?.appointments ?? 0)}
				hint={`${kpis?.attended ?? 0} / ${kpis?.appointments ?? 0} ${UI.KPI_ATTENDANCE_BASE}`}
				isLoading={isLoading}
			/>
			<Kpi
				label={UI.KPI_STUCK}
				value={String(data?.stuckTotal ?? 0)}
				hint={UI.KPI_STUCK_HINT}
				isLoading={isLoading}
			/>
		</div>
	)
}
