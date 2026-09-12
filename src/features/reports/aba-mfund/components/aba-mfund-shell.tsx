'use client'

import { useState } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import { HierarchySelectionProvider } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { HierarchyTreePanel } from '@/features/production-dashboard/components/HierarchyTreePanel'
import { AbaMfundFilterProvider } from './aba-mfund-filter-context'
import { AbaMfundFilterBar } from './aba-mfund-filter-bar'
import { AbaMfundKpiCards } from './aba-mfund-kpi-cards'
import { AbaMfundRankingPanel } from './aba-mfund-ranking-panel'
import { AbaMfundDetailTable } from './aba-mfund-detail-table'
import { useAbaMfundKpis } from '../hooks/use-aba-mfund-kpis'
import { useAbaMfundRanking } from '../hooks/use-aba-mfund-ranking'
import { useAbaMfundDetail } from '../hooks/use-aba-mfund-detail'
import { useAbaMfundExport } from '../hooks/use-aba-mfund-export'
import { ABA_MFUND_UI } from '../lib/ui-copy'

function ShellContent() {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const { state: kpiState } = useAbaMfundKpis()
	const { state: rankingState } = useAbaMfundRanking()
	const { state: detailState, loadMore, isLoadingMore } = useAbaMfundDetail()
	const { exportExcel, isExporting } = useAbaMfundExport()

	return (
		<div className="flex flex-1 min-h-0 overflow-hidden">
			<aside
				className="shrink-0 overflow-hidden flex flex-col transition-all duration-300 ease-in-out"
				style={{
					width: sidebarCollapsed ? 0 : 288,
					borderRight: '1px solid rgba(0,60,69,0.15)',
				}}
				aria-label={ABA_MFUND_UI.HIERARCHY}
			>
				<HierarchyTreePanel onCollapse={() => setSidebarCollapsed(true)} />
			</aside>

			<main className="flex-1 overflow-y-auto p-6 space-y-4">
				{sidebarCollapsed ? (
					<button
						type="button"
						aria-label={ABA_MFUND_UI.EXPAND_HIERARCHY}
						onClick={() => setSidebarCollapsed(false)}
						className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
					>
						<PanelLeftOpen className="size-3.5" />
						{ABA_MFUND_UI.HIERARCHY}
					</button>
				) : null}

				<AbaMfundFilterBar
					onExportExcel={exportExcel}
					isExporting={isExporting}
				/>
				<AbaMfundKpiCards state={kpiState} />
				<AbaMfundRankingPanel state={rankingState} />
				<AbaMfundDetailTable
					state={detailState}
					loadMore={loadMore}
					isLoadingMore={isLoadingMore}
				/>
			</main>
		</div>
	)
}

/**
 * Client shell: HierarchySelectionProvider > FilterProvider > content.
 * No TRM / Compañía / Producto / Tipo de Aporte / Moneda.
 */
export function AbaMfundShell() {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<HierarchySelectionProvider>
				<AbaMfundFilterProvider>
					<ShellContent />
				</AbaMfundFilterProvider>
			</HierarchySelectionProvider>
		</div>
	)
}
