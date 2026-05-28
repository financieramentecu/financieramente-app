'use client'

import { useEffect } from 'react'
import { Users, CheckSquare, Square } from 'lucide-react'
import { useHierarchyTree } from '@/features/production-dashboard/hooks/use-hierarchy-tree'
import {
	useHierarchySelection,
} from '@/features/production-dashboard/components/HierarchySelectionContext'
import { HierarchyTreeNode } from '@/features/production-dashboard/components/HierarchyTreeNode'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { TooltipProvider } from '@/features/shared/ui/tooltip'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { HierarchyTreeData } from '@/features/production-dashboard/types/hierarchy.types'

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function HierarchyTreeSkeleton() {
	return (
		<div
			data-testid="hierarchy-panel-skeleton"
			className="space-y-1.5 p-3"
			aria-busy="true"
			aria-label="Cargando jerarquía"
		>
		{[80, 64, 72, 56, 68].map((w) => (
			<div key={w} className="flex items-center gap-2 px-2 py-1.5">
				<Skeleton className="size-3.5 rounded-sm" />
				<Skeleton className="size-3.5 rounded-full" />
				<Skeleton className="h-3.5 rounded" style={{ width: `${w}%` }} />
			</div>
		))}
		</div>
	)
}

// ---------------------------------------------------------------------------
// Inner content (lives inside HierarchySelectionProvider)
// ---------------------------------------------------------------------------

type PanelContentProps = {
	apiState: AsyncState<HierarchyTreeData>
	activeCategoryIds?: number[]
}

function PanelContent({ apiState, activeCategoryIds = [] }: PanelContentProps) {
	const { nodes, dispatch, selectedUserIds } = useHierarchySelection()
	const totalNodes = countNodes(0, ...nodes)
	const allSelected = nodes.length > 0 && selectedUserIds.length === totalNodes
	const noneSelected = selectedUserIds.length === 0

	useEffect(() => {
		if (apiState.status === 'success') {
			dispatch({ type: 'INIT', nodes: apiState.data.nodes })
		}
	}, [apiState, dispatch])

	if (apiState.status === 'loading' || apiState.status === 'idle') {
		return <HierarchyTreeSkeleton />
	}

	if (apiState.status === 'error') {
		return (
			<div className="p-4 text-sm text-red-400" role="alert">
				{apiState.error}
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div
				className="flex items-center justify-between px-3 py-2.5"
				style={{ borderBottom: '1px solid rgba(0,60,69,0.15)' }}
			>
				<div className="flex items-center gap-2">
					<Users className="size-4" style={{ color: '#003c45' }} aria-hidden="true" />
					<span
						className="text-xs font-semibold uppercase tracking-wider"
						style={{ color: '#003c45' }}
					>
						Árbol de jerarquía
					</span>
				</div>

				{/* Select all / deselect all */}
				<div className="flex items-center gap-1">
					<span
						className="text-[10px]"
						style={{ color: 'rgba(0,60,69,0.5)' }}
					>
						{selectedUserIds.length > 0
							? `${selectedUserIds.length} sel.`
							: 'Ninguno'}
					</span>
					<button
						type="button"
						title={allSelected ? 'Desmarcar todo' : 'Marcar todo'}
						aria-label={allSelected ? 'Desmarcar todo' : 'Marcar todo'}
						onClick={() => dispatch({ type: allSelected ? 'DESELECT_ALL' : 'SELECT_ALL' })}
						className="cursor-pointer rounded p-0.5 transition-colors"
						style={{ color: 'rgba(0,60,69,0.5)' }}
					>
						{allSelected || !noneSelected ? (
							<CheckSquare className="size-3.5" />
						) : (
							<Square className="size-3.5" />
						)}
					</button>
				</div>
			</div>

			{/* Tree */}
			<nav
				aria-label="Filtro de jerarquía"
				className="flex-1 overflow-y-auto px-2 py-2"
			>
				<ul className="space-y-px" role="tree">
					{nodes.map((node) => (
						<HierarchyTreeNode
							key={node.userId}
							node={node}
							activeCategoryIds={activeCategoryIds}
						/>
					))}
				</ul>
			</nav>

			{/* Footer: selection summary */}
			{nodes.length > 0 && (
				<div
					className="px-3 py-2"
					style={{ borderTop: '1px solid rgba(0,60,69,0.15)' }}
				>
					<p
						className="text-[10px]"
						style={{ color: 'rgba(0,60,69,0.5)' }}
					>
						{selectedUserIds.length} de {totalNodes} usuarios seleccionados
					</p>
				</div>
			)}
		</div>
	)
}

function countNodes(acc: number, ...nodesArr: HierarchyTreeData['nodes'][number][]): number {
	return nodesArr.reduce(
		(sum, node) => sum + 1 + countNodes(0, ...node.children),
		acc
	)
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

type HierarchyTreePanelProps = {
	/** Category IDs from DashboardFilterContext. Non-matching nodes are dimmed. */
	activeCategoryIds?: number[]
}

export function HierarchyTreePanel({ activeCategoryIds = [] }: HierarchyTreePanelProps) {
	const { state } = useHierarchyTree()

	// Spec: panel must NOT render when nodes is empty (MS Junior case)
	if (state.status === 'success' && state.data.nodes.length === 0) {
		return null
	}

	return (
		<TooltipProvider delayDuration={400}>
			<div className="flex h-full flex-col bg-white">
				<PanelContent apiState={state} activeCategoryIds={activeCategoryIds} />
			</div>
		</TooltipProvider>
	)
}
