'use client'

import type { ReactNode } from 'react'
import { HierarchySelectionProvider } from './HierarchySelectionContext'
import { DashboardFilterProvider, useDashboardFilter } from './DashboardFilterContext'
import { HierarchyTreePanel } from './HierarchyTreePanel'
import { DashboardFilterPanel } from './DashboardFilterPanel'
import { UsdKpiPanel } from './UsdKpiPanel'
import { MsGroupedBarChart } from './MsGroupedBarChart'
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

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left — Hierarchy tree panel */}
      <aside
        className="w-72 shrink-0 overflow-hidden flex flex-col"
        style={{ borderRight: '1px solid rgba(0,60,69,0.15)' }}
      >
        <HierarchyTreePanel activeCategoryIds={appliedFilters.categoryIds} />
      </aside>

      {/* Right — Filters + KPIs */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <DashboardFilterPanel />
        <UsdKpiPanel
          isLoading={trmLoading}
          trmRate={trmRate}
          trmState={trmState}
          isManual={isManual}
          error={error}
          setManualTrm={setManualTrm}
        />
        <MsBarChartPanel trmRate={trmRate} />
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
