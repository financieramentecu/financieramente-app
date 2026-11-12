'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import { HierarchySelectionProvider, useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { HierarchyTreePanel } from '@/features/production-dashboard/components/HierarchyTreePanel'
import { resolveCrmOwnerIds, type CrmHierarchyFilter } from '@/features/leads/lib/resolve-crm-owner-ids'

const STANDALONE_FILTER: CrmHierarchyFilter = { ready: true, noneSelected: false, ownerIds: [] }

function sameFilter(left: CrmHierarchyFilter, right: CrmHierarchyFilter): boolean {
	return (
		left.ready === right.ready &&
		left.noneSelected === right.noneSelected &&
		left.ownerIds.length === right.ownerIds.length &&
		left.ownerIds.every((id, index) => id === right.ownerIds[index])
	)
}

const CrmHierarchyFilterContext = createContext<CrmHierarchyFilter>(STANDALONE_FILTER)

export const CRM_HIERARCHY_EMPTY_MESSAGE =
	'Selecciona al menos una persona de la jerarquía para ver su información.'

/** Owner filter derived from the CRM hierarchy tree. Outside the shell, nothing is narrowed. */
export function useCrmHierarchyFilter(): CrmHierarchyFilter {
	return useContext(CrmHierarchyFilterContext)
}

/**
 * Same hierarchy tree as the dashboard. A super admin sees the whole company.
 * Everyone else sees themselves and the people under them, and can uncheck
 * branches to look at specific people.
 */
export function CrmHierarchyShell({ children }: { children: ReactNode }) {
	return (
		<HierarchySelectionProvider>
			<CrmHierarchyLayout>{children}</CrmHierarchyLayout>
		</HierarchySelectionProvider>
	)
}

function CrmHierarchyLayout({ children }: { children: ReactNode }) {
	const { nodes, selectedUserIds } = useHierarchySelection()
	const [collapsed, setCollapsed] = useState(false)
	const [hidePanel, setHidePanel] = useState(false)
	const [loaded, setLoaded] = useState(false)
	const [treeNodeCount, setTreeNodeCount] = useState(0)
	const resolved = resolveCrmOwnerIds({
		loaded,
		selectionNodeCount: nodes.length,
		treeNodeCount,
		selectedUserIds,
	})
	const filterKey = `${resolved.ready}:${resolved.noneSelected}:${resolved.ownerIds.join(',')}`
	// Start on the server's own scope so Pipeline, tasks and cases do not wait
	// for the tree. The first paint already shows everyone the viewer may see.
	const [filter, setFilter] = useState<CrmHierarchyFilter>(STANDALONE_FILTER)

	useEffect(() => {
		if (!resolved.ready) return
		setFilter((current) => (sameFilter(current, resolved) ? current : resolved))
		// filterKey is the identity of the resolved filter.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterKey])

	return (
		<CrmHierarchyFilterContext.Provider value={filter}>
			<div className="flex min-h-[32rem] items-stretch overflow-hidden rounded-lg border border-border">
				{!hidePanel && (
					<aside
						className={collapsed ? 'w-0 overflow-hidden' : 'max-h-[calc(100vh-12rem)] w-96 shrink-0 overflow-y-auto border-r border-border'}
						aria-label="Jerarquía"
					>
						<HierarchyTreePanel
							wrapNames
							onCollapse={() => setCollapsed(true)}
							onEmptyChange={setHidePanel}
							onLoaded={(nodeCount) => {
								setTreeNodeCount(nodeCount)
								setLoaded(true)
							}}
						/>
					</aside>
				)}
				<div className="min-w-0 flex-1 space-y-4">
					{collapsed && !hidePanel && (
						<button
							type="button"
							aria-label="Mostrar jerarquía"
							onClick={() => setCollapsed(false)}
							className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
						>
							<PanelLeftOpen className="size-3.5" />
							Jerarquía
						</button>
					)}
					{children}
				</div>
			</div>
		</CrmHierarchyFilterContext.Provider>
	)
}
