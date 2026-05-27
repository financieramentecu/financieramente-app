'use client'

import type { ReactNode } from 'react'
import { HierarchySelectionProvider } from './HierarchySelectionContext'
import { DashboardFilterProvider, useDashboardFilter } from './DashboardFilterContext'
import { HierarchyTreePanel } from './HierarchyTreePanel'
import { DashboardFilterPanel } from './DashboardFilterPanel'

function ShellContent({ children }: { children?: ReactNode }) {
  const { appliedFilters } = useDashboardFilter()

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
        {children ?? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Selecciona usuarios en el árbol para ver su producción
            </p>
          </div>
        )}
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
