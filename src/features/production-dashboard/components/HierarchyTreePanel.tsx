'use client'

import { useEffect, useState } from 'react'
import { Users, CheckSquare, Square, Search, X, PanelLeftClose } from 'lucide-react'
// CheckSquare and Square used only in the header select-all button
import { useHierarchyTree } from '@/features/production-dashboard/hooks/use-hierarchy-tree'
import {
	useHierarchySelection,
} from '@/features/production-dashboard/components/HierarchySelectionContext'
import { HierarchyTreeNode } from '@/features/production-dashboard/components/HierarchyTreeNode'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { TooltipProvider } from '@/features/shared/ui/tooltip'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { HierarchyNode, HierarchyTreeData } from '@/features/production-dashboard/types/hierarchy.types'

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
	onCollapse?: () => void
}

function PanelContent({ apiState, activeCategoryIds = [], onCollapse }: PanelContentProps) {
	const { nodes, dispatch, selectedUserIds, toggle } = useHierarchySelection()
	const [searchQuery, setSearchQuery] = useState('')
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

	const query = searchQuery.trim()
	const searchResults = query
		? flattenNodes(nodes).filter((n) =>
				n.fullName.toLowerCase().includes(query.toLowerCase())
			)
		: []

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
						Jerarquía
					</span>
				</div>

				<div className="flex items-center gap-1">
					<span className="text-[10px]" style={{ color: 'rgba(0,60,69,0.5)' }}>
						{selectedUserIds.length > 0 ? `${selectedUserIds.length} sel.` : 'Ninguno'}
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
					{onCollapse && (
						<button
							type="button"
							title="Colapsar panel"
							aria-label="Colapsar panel de jerarquía"
							onClick={onCollapse}
							className="cursor-pointer rounded p-0.5 transition-colors hover:bg-muted/40"
							style={{ color: 'rgba(0,60,69,0.5)' }}
						>
							<PanelLeftClose className="size-3.5" />
						</button>
					)}
				</div>
			</div>

			{/* Search input */}
			<div className="px-2 py-2" style={{ borderBottom: '1px solid rgba(0,60,69,0.10)' }}>
				<div className="relative flex items-center">
					<Search className="absolute left-2 size-3.5 pointer-events-none" style={{ color: 'rgba(0,60,69,0.4)' }} />
					<input
						type="text"
						placeholder="Buscar Money Strategist…"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-7 text-xs outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
					/>
					{searchQuery && (
						<button
							type="button"
							aria-label="Limpiar búsqueda"
							onClick={() => setSearchQuery('')}
							className="absolute right-2 cursor-pointer"
							style={{ color: 'rgba(0,60,69,0.4)' }}
						>
							<X className="size-3" />
						</button>
					)}
				</div>
			</div>

			{/* Body: search results OR full tree */}
			{query ? (
				<div className="flex-1 overflow-y-auto px-2 py-2">
					{searchResults.length === 0 ? (
						<p className="px-2 py-3 text-center text-[11px]" style={{ color: 'rgba(0,60,69,0.4)' }}>
							Sin resultados para &ldquo;{query}&rdquo;
						</p>
					) : (
						<ul className="space-y-px">
							{searchResults.map((node) => (
								<li key={node.userId} className="select-none">
									<div className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-[rgba(0,60,69,0.06)]">
										<input
											type="checkbox"
											id={`search-node-${node.userId}`}
											checked={node.included}
											onChange={() => toggle(node.userId)}
											className="size-3.5 shrink-0 cursor-pointer rounded-sm accent-primary"
										/>
										<label
											htmlFor={`search-node-${node.userId}`}
											className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
										>
											<span
												className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
												style={{
													backgroundColor: node.levelColor + '22',
													color: node.levelColor,
													border: `1.5px solid ${node.levelColor}44`,
												}}
											>
												{getInitials(node.fullName)}
											</span>
											<span className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span
													className="truncate text-[13px] font-semibold leading-tight"
													style={{
														color: '#003c45',
														textDecoration: node.included ? 'none' : 'line-through',
													}}
												>
													<HighlightMatch text={node.fullName} query={query} />
												</span>
												{node.categoryName && (
													<span className="truncate text-[10px] font-medium leading-none" style={{ color: node.levelColor }}>
														{node.categoryName}
													</span>
												)}
											</span>
											<span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: node.levelColor }} />
										</label>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			) : (
				<nav aria-label="Filtro de jerarquía" className="flex-1 overflow-y-auto px-2 py-2">
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
			)}

			{/* Footer */}
			{nodes.length > 0 && (
				<div className="px-3 py-2" style={{ borderTop: '1px solid rgba(0,60,69,0.15)' }}>
					<p className="text-[10px]" style={{ color: 'rgba(0,60,69,0.5)' }}>
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

function flattenNodes(nodes: HierarchyNode[]): HierarchyNode[] {
	return nodes.flatMap((n) => [n, ...flattenNodes(n.children)])
}

function getInitials(fullName: string): string {
	const parts = fullName.trim().split(/\s+/)
	if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
	return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
	const idx = text.toLowerCase().indexOf(query.toLowerCase())
	if (idx === -1) return <span>{text}</span>
	return (
		<>
			{text.slice(0, idx)}
			<mark className="rounded bg-yellow-200 px-0.5 text-yellow-900">
				{text.slice(idx, idx + query.length)}
			</mark>
			{text.slice(idx + query.length)}
		</>
	)
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

type HierarchyTreePanelProps = {
	activeCategoryIds?: number[]
	onCollapse?: () => void
}

export function HierarchyTreePanel({ activeCategoryIds = [], onCollapse }: HierarchyTreePanelProps) {
	const { state } = useHierarchyTree()

	if (state.status === 'success' && state.data.nodes.length === 0) {
		return null
	}

	return (
		<TooltipProvider delayDuration={400}>
			<div className="flex h-full flex-col bg-white">
				<PanelContent apiState={state} activeCategoryIds={activeCategoryIds} onCollapse={onCollapse} />
			</div>
		</TooltipProvider>
	)
}
