'use client'

import { useState } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import { HierarchySelectionProvider } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { HierarchyTreePanel } from '@/features/production-dashboard/components/HierarchyTreePanel'
import { useTrm } from '@/features/production-dashboard/hooks/use-trm'
import { ProduccionRealFilterProvider } from './produccion-real-filter-context'
import { ProduccionRealFilterBar } from './produccion-real-filter-bar'
import { ProduccionRealKpiCards } from './produccion-real-kpi-cards'
import { RegularVsUnicaBars } from './regular-vs-unica-bars'
import { ProduccionRealDetailTable } from './produccion-real-detail-table'
import { useProduccionRealKpis } from '../hooks/use-produccion-real-kpis'
import { useProduccionRealDetail } from '../hooks/use-produccion-real-detail'
import { useProduccionRealExport } from '../hooks/use-produccion-real-export'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'

interface ShellContentProps {
	readonly canExport: boolean
}

function ShellContent({ canExport }: ShellContentProps) {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const {
		trmRate,
		isLoading: trmLoading,
		trmState,
		error: trmError,
		setManualTrm,
	} = useTrm()

	const { state: kpiState } = useProduccionRealKpis({
		trmRate,
		trmLoading,
		trmError,
	})
	const { state: detailState, loadMore, isLoadingMore } =
		useProduccionRealDetail({
			trmRate,
			trmLoading,
		})
	const { exportExcel, isExporting } = useProduccionRealExport({
		trmRate,
		trmLoading,
		trmError,
	})

	return (
		<div className="flex flex-1 min-h-0 overflow-hidden">
			<aside
				className="shrink-0 overflow-hidden flex flex-col transition-all duration-300 ease-in-out"
				style={{
					width: sidebarCollapsed ? 0 : 288,
					borderRight: '1px solid rgba(0,60,69,0.15)',
				}}
				aria-label={PRODUCCION_REAL_UI.HIERARCHY}
			>
				<HierarchyTreePanel onCollapse={() => setSidebarCollapsed(true)} />
			</aside>

			<main className="flex-1 overflow-y-auto p-6 space-y-4">
				{sidebarCollapsed ? (
					<button
						type="button"
						aria-label="Expandir panel de jerarquía"
						onClick={() => setSidebarCollapsed(false)}
						className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
					>
						<PanelLeftOpen className="size-3.5" />
						{PRODUCCION_REAL_UI.HIERARCHY}
					</button>
				) : null}

				<ProduccionRealFilterBar
					onExportExcel={exportExcel}
					isExporting={isExporting}
					canExport={canExport}
				/>
				<ProduccionRealKpiCards
					state={kpiState}
					trmRate={trmRate}
					trmState={trmState}
					trmLoading={trmLoading}
					trmError={trmError}
					setManualTrm={setManualTrm}
				/>
				<RegularVsUnicaBars state={kpiState} trmRate={trmRate} />
				<ProduccionRealDetailTable
					state={detailState}
					loadMore={loadMore}
					isLoadingMore={isLoadingMore}
				/>
			</main>
		</div>
	)
}

interface ProduccionRealShellProps {
	/** Company-wide read-only role (CONSULTOR) never sees the export action. Defaults to true. */
	readonly canExport?: boolean
}

/**
 * Client shell: HierarchySelectionProvider > FilterProvider > content.
 * Mirrors production dashboard composition (ADR-3 / design D5).
 */
export function ProduccionRealShell({ canExport = true }: ProduccionRealShellProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<HierarchySelectionProvider>
				<ProduccionRealFilterProvider>
					<ShellContent canExport={canExport} />
				</ProduccionRealFilterProvider>
			</HierarchySelectionProvider>
		</div>
	)
}
