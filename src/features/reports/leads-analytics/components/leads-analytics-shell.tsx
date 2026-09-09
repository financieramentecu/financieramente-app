'use client'

import { useState } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import {
	HierarchySelectionProvider,
	useHierarchySelection,
} from '@/features/production-dashboard/components/HierarchySelectionContext'
import { HierarchyTreePanel } from '@/features/production-dashboard/components/HierarchyTreePanel'
import { FollowUpStatusBars } from './follow-up-status-bars'
import { ConvertedLeadsChart } from './converted-leads-chart'
import { LeadsAnalyticsDetailProvider } from './leads-analytics-detail-context'
import { LeadsAnalyticsFilterProvider } from './leads-analytics-filter-context'
import { LeadsAnalyticsFilterBar } from './leads-analytics-filter-bar'
import { LeadsHeatmapTable } from './leads-heatmap-table'
import { useLeadsAnalyticsReport } from '../hooks/use-leads-analytics-report'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'

function ShellContent() {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const { selectedUserIds } = useHierarchySelection()
	const { state } = useLeadsAnalyticsReport()

	return (
		<div className="flex min-h-0 flex-1 overflow-hidden">
			<aside
				className="flex shrink-0 flex-col overflow-hidden transition-all duration-300 ease-in-out"
				style={{
					width: sidebarCollapsed ? 0 : 288,
					borderRight: '1px solid rgba(0,60,69,0.15)',
				}}
				aria-label={LEADS_ANALYTICS_UI.HIERARCHY}
			>
				<HierarchyTreePanel onCollapse={() => setSidebarCollapsed(true)} />
			</aside>

			<main className="flex-1 space-y-4 overflow-y-auto p-6">
				{sidebarCollapsed ? (
					<button
						type="button"
						aria-label={LEADS_ANALYTICS_UI.EXPAND_HIERARCHY}
						onClick={() => setSidebarCollapsed(false)}
						className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
					>
						<PanelLeftOpen className="size-3.5" />
						{LEADS_ANALYTICS_UI.HIERARCHY}
					</button>
				) : null}

				<LeadsAnalyticsFilterBar />

				{selectedUserIds.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{LEADS_ANALYTICS_UI.EMPTY_HIERARCHY}
					</p>
				) : null}

				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<FollowUpStatusBars state={state} />
					<ConvertedLeadsChart state={state} />
				</div>

				<LeadsHeatmapTable state={state} />
			</main>
		</div>
	)
}

/**
 * Client shell: hierarchy tree + date filters + funnel charts.
 */
export function LeadsAnalyticsShell() {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<HierarchySelectionProvider>
				<LeadsAnalyticsFilterProvider>
					<LeadsAnalyticsDetailProvider>
						<ShellContent />
					</LeadsAnalyticsDetailProvider>
				</LeadsAnalyticsFilterProvider>
			</HierarchySelectionProvider>
		</div>
	)
}
