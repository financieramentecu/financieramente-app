'use client'

import { useState } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import {
	HierarchySelectionProvider,
	useHierarchySelection,
} from '@/features/production-dashboard/components/HierarchySelectionContext'
import { HierarchyTreePanel } from '@/features/production-dashboard/components/HierarchyTreePanel'
import { LeadsAnalyticsFilterBar } from '@/features/reports/leads-analytics/components/leads-analytics-filter-bar'
import { LeadsAnalyticsFilterProvider } from '@/features/reports/leads-analytics/components/leads-analytics-filter-context'
import { useCommercialDashboardReport } from '../hooks/use-commercial-dashboard-report'
import { COMMERCIAL_DASHBOARD_UI as UI } from '../lib/ui-copy'
import { CommercialPipelineFilter } from './commercial-pipeline-filter'
import { CommercialFunnel } from './commercial-funnel'
import { CommercialKpiCards } from './commercial-kpi-cards'
import {
	CommercialCloseTimesChart,
	CommercialConversionChart,
	CommercialMsRankingChart,
} from './commercial-metric-charts'
import { CommercialMsTable } from './commercial-ms-table'
import { CommercialOriginCards } from './commercial-origin-cards'
import { CommercialOriginChart } from './commercial-origin-chart'
import { CommercialOriginTable } from './commercial-origin-table'
import { CommercialStuckList } from './commercial-stuck-list'

function ShellContent() {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const { selectedUserIds } = useHierarchySelection()
	const [pipelines, setPipelines] = useState<readonly string[] | null>(null)
	const { state } = useCommercialDashboardReport(pipelines ?? [])
	const pipelineOptions = state.status === 'success' ? state.data.pipelines : []
	const showHistoryNote =
		state.status === 'success' && !state.data.hasStageHistory

	return (
		<div className="flex min-h-0 flex-1 overflow-hidden">
			<aside
				className={`flex shrink-0 flex-col overflow-hidden transition-all duration-300 ease-in-out ${sidebarCollapsed ? '' : 'border-r border-border'}`}
				style={{ width: sidebarCollapsed ? 0 : 288 }}
				aria-label={UI.HIERARCHY}
			>
				<HierarchyTreePanel onCollapse={() => setSidebarCollapsed(true)} />
			</aside>

			<main className="flex-1 space-y-4 overflow-y-auto p-6">
				{sidebarCollapsed ? (
					<button
						type="button"
						aria-label={UI.EXPAND_HIERARCHY}
						onClick={() => setSidebarCollapsed(false)}
						className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
					>
						<PanelLeftOpen className="size-3.5" />
						{UI.HIERARCHY}
					</button>
				) : null}

				<LeadsAnalyticsFilterBar />

				<CommercialPipelineFilter
					options={pipelineOptions}
					selected={pipelines}
					onChange={setPipelines}
				/>

				{selectedUserIds.length === 0 ? (
					<p className="text-sm text-muted-foreground">{UI.EMPTY_HIERARCHY}</p>
				) : null}

				{state.status === 'error' ? (
					<p role="alert" className="text-sm text-destructive">
						{state.error}
					</p>
				) : null}

				{showHistoryNote ? (
					<p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
						{UI.NO_HISTORY}
					</p>
				) : null}

				{state.status === 'success' && state.data.unassigned > 0 ? (
					<p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-foreground">
						<span className="font-semibold tabular-nums">
							{state.data.unassigned}
						</span>{' '}
						{UI.UNASSIGNED_NOTICE}
					</p>
				) : null}

				<CommercialKpiCards state={state} />

				<CommercialOriginCards state={state} />

				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<CommercialConversionChart state={state} />
					<CommercialCloseTimesChart state={state} />
				</div>

				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<CommercialOriginChart state={state} />
					<CommercialMsRankingChart state={state} />
				</div>

				<CommercialOriginTable state={state} />

				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<CommercialFunnel state={state} />
					<CommercialStuckList state={state} />
				</div>

				<CommercialMsTable state={state} />
			</main>
		</div>
	)
}

/**
 * Client shell: hierarchy tree + date filters + commercial metrics.
 */
export function CommercialDashboardShell() {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<HierarchySelectionProvider>
				<LeadsAnalyticsFilterProvider>
					<ShellContent />
				</LeadsAnalyticsFilterProvider>
			</HierarchySelectionProvider>
		</div>
	)
}
