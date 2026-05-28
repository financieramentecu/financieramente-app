'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import { HierarchySelectionProvider } from './HierarchySelectionContext'
import { DashboardFilterProvider, useDashboardFilter } from './DashboardFilterContext'
import { HierarchyTreePanel } from './HierarchyTreePanel'
import { DashboardFilterPanel } from './DashboardFilterPanel'
import { UsdKpiPanel } from './UsdKpiPanel'
import { MsGroupedBarChart } from './MsGroupedBarChart'
import { HeatmapTablePanel } from './HeatmapTablePanel'
import { OriginDonutPanel } from './OriginDonutPanel'
import { CompanyDonutPanel } from './CompanyDonutPanel'
import { useTrm } from '../hooks/use-trm'
import { useMsBarChart } from '../hooks/use-ms-bar-chart'

interface MsBarChartPanelProps {
  readonly trmRate: number | null
}

/**
 * Thin wrapper that owns the useMsBarChart hook call and passes results
 * to the pure MsGroupedBarChart renderer.
 */
function MsBarChartPanel({ trmRate }: MsBarChartPanelProps) {
  const chartState = useMsBarChart(trmRate)

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        Producción por Money Strategist
      </h2>
      <MsGroupedBarChart chartState={chartState} trmRate={trmRate} />
    </section>
  )
}

function ShellContent({ children }: { children?: ReactNode }) {
  const { appliedFilters } = useDashboardFilter()
  const { isLoading: trmLoading, trmRate, trmState, isManual, error, setManualTrm } = useTrm()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left — Hierarchy tree panel */}
      <aside
        className="shrink-0 overflow-hidden flex flex-col transition-all duration-300 ease-in-out"
        style={{
          width: sidebarCollapsed ? 0 : 288,
          borderRight: '1px solid rgba(0,60,69,0.15)',
        }}
      >
        <HierarchyTreePanel
          activeCategoryIds={appliedFilters.categoryIds}
          onCollapse={() => setSidebarCollapsed(true)}
        />
      </aside>

      {/* Right — Filters + KPIs */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {sidebarCollapsed && (
          <button
            type="button"
            aria-label="Expandir panel de jerarquía"
            onClick={() => setSidebarCollapsed(false)}
            className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <PanelLeftOpen className="size-3.5" />
            Jerarquía
          </button>
        )}
        <DashboardFilterPanel />
        <UsdKpiPanel
          isLoading={trmLoading}
          trmRate={trmRate}
          trmState={trmState}
          isManual={isManual}
          error={error}
          setManualTrm={setManualTrm}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OriginDonutPanel trmRate={trmRate} />
          <CompanyDonutPanel trmRate={trmRate} />
        </div>
        <MsBarChartPanel trmRate={trmRate} />
        <HeatmapTablePanel trmRate={trmRate} />
        {children ?? null}
      </main>
    </div>
  )
}

interface DashboardShellProps {
  children?: ReactNode
}

/**
 * Client-side shell for the Production Dashboard.
 * Provider order: HierarchySelectionProvider > DashboardFilterProvider (per design ADR-3).
 * ShellContent lives inside DashboardFilterProvider so it can read appliedFilters.categoryIds
 * and pass them to HierarchyTreePanel for node dimming.
 * useTrm() is lifted here to avoid duplicate GET /api/trm calls from UsdKpiPanel and MsBarChartPanel.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <HierarchySelectionProvider>
      <DashboardFilterProvider>
        <ShellContent>{children}</ShellContent>
      </DashboardFilterProvider>
    </HierarchySelectionProvider>
  )
}
