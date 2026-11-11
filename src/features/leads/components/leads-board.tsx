'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCorners,
	pointerWithin,
	useSensor,
	useSensors,
	type CollisionDetection,
	type DragEndEvent,
	type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { useLeadsBoard } from '@/features/leads/hooks/use-leads-board'
import { LeadBoardColumn } from '@/features/leads/components/lead-board-column'
import { LeadFunnelColumnSkeleton } from '@/features/leads/components/lead-funnel-column-skeleton'
import { CrmLeadDetailSheet } from '@/features/leads/components/crm-lead-detail-sheet'
import { useLeadDetailSheet } from '@/features/leads/hooks/use-lead-detail-sheet'
import { CrmSummaryCards } from '@/features/leads/analytics/crm-summary-cards'
import { LeadsBoardFilters } from '@/features/leads/components/leads-board-filters'
import { getDefaultLeadBoardFilters } from '@/features/leads/lib/lead-board-filters'
import { parsePrefixedId } from '@/features/leads/lib/parse-board-drag-id'
import { moveLeadOnBoard, restoreLeadIfStillInColumn } from '@/features/leads/lib/move-lead-on-board'
import { CRM_HIERARCHY_EMPTY_MESSAGE, useCrmHierarchyFilter } from '@/features/leads/components/crm-hierarchy-shell'
import { Button } from '@/features/shared/ui/button'
import { cn } from '@/lib/utils'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'
import { LeadCard } from '@/features/leads/components/lead-card'
import type { LeadCard as LeadCardType } from '@/features/leads/types/lead.types'

/** Prefer the column under the pointer so a card can cross into the next stage. */
const kanbanCollision: CollisionDetection = (args) => {
	const hits = pointerWithin(args)
	return hits.length > 0 ? hits : closestCorners(args)
}

/**
 * Leads Kanban. Cards move between columns with drag and drop; the stage
 * change is stored as a manual action of the signed-in user.
 */
export function LeadsBoard() {
	const { enabled: reportsEnabled } = useFeatureFlag('crm_reports')
	const hierarchy = useCrmHierarchyFilter()
	const [filters, setFilters] = useState(getDefaultLeadBoardFilters())
	const ownerKey = hierarchy.ownerIds.join(',')
	useEffect(() => {
		if (!hierarchy.ready) return
		setFilters((current) =>
			current.ownerIds.join(',') === ownerKey ? current : { ...current, ownerIds: hierarchy.ownerIds }
		)
	}, [hierarchy.ready, hierarchy.ownerIds, ownerKey])
	const { state, refetch, updateColumns } = useLeadsBoard(filters, !hierarchy.ready || hierarchy.noneSelected)
	const isRefreshing = state.status === 'loading'
	const sheet = useLeadDetailSheet()
	const [draggingLead, setDraggingLead] = useState<LeadCardType | null>(null)
	const skipClick = useRef(false)
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

	function handleLeadDeleted() {
		sheet.setOpen(false)
		refetch()
	}

	function handleDragStart(event: DragStartEvent) {
		skipClick.current = true
		const idLead = parsePrefixedId(event.active.id, 'lead:')
		if (!idLead || state.status !== 'success') return
		const lead = state.data.flatMap((column) => column.leads).find((item) => item.idLead === idLead)
		setDraggingLead(lead ?? null)
	}

	function finishDrag() {
		setDraggingLead(null)
		window.setTimeout(() => {
			skipClick.current = false
		}, 0)
	}

	function openLead(idLead: number) {
		if (skipClick.current) return
		void sheet.openLead(idLead)
	}

	async function handleDragEnd(event: DragEndEvent) {
		finishDrag()
		const idLead = parsePrefixedId(event.active.id, 'lead:')
		const toColumn = parsePrefixedId(event.over?.id, 'column:')
		if (!idLead || !toColumn || state.status !== 'success') return
		const fromColumn = state.data.find((column) => column.leads.some((lead) => lead.idLead === idLead))
		const next = moveLeadOnBoard(state.data, idLead, toColumn)
		if (!fromColumn || !next) return
		const homeColumnId = fromColumn.idLeadFunnelColumn
		updateColumns(() => next)

		try {
			const response = await fetch(`/api/leads/${idLead}/stage`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idLeadFunnelColumn: toColumn }),
			})
			if (!response.ok) {
				const body = (await response.json()) as { error?: string }
				updateColumns((columns) => restoreLeadIfStillInColumn(columns, idLead, toColumn, homeColumnId))
				toast.error('No se guardó el cambio de etapa', {
					description: body.error ?? 'No fue posible mover el lead.',
				})
				return
			}
			toast.success('Etapa actualizada')
		} catch {
			updateColumns((columns) => restoreLeadIfStillInColumn(columns, idLead, toColumn, homeColumnId))
			toast.error('No se guardó el cambio de etapa', { description: 'No fue posible mover el lead.' })
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<LeadsBoardFilters value={filters} onChange={setFilters} />
				<Button
					variant="outline"
					size="sm"
					onClick={refetch}
					disabled={isRefreshing}
					aria-label="Actualizar tablero de leads"
				>
					<RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} aria-hidden />
					Actualizar
				</Button>
			</div>
			<CrmSummaryCards enabled={reportsEnabled} />
			{hierarchy.noneSelected ? (
				<p className="text-sm text-muted-foreground">{CRM_HIERARCHY_EMPTY_MESSAGE}</p>
			) : (
				<>
			{(state.status === 'loading' || state.status === 'idle') && (
				<div className="flex gap-4 overflow-x-auto pb-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<LeadFunnelColumnSkeleton key={index} />
					))}
				</div>
			)}
			{state.status === 'error' && (
				<p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
					{state.error}
				</p>
			)}
			{state.status === 'success' && (
				<DndContext
					sensors={sensors}
					collisionDetection={kanbanCollision}
					onDragStart={handleDragStart}
					onDragCancel={finishDrag}
					onDragEnd={(event) => void handleDragEnd(event)}
				>
					<div className="flex gap-4 overflow-x-auto pb-4">
						{state.data.map((column) => (
							<LeadBoardColumn
								key={column.idLeadFunnelColumn}
								column={column}
								onLeadClick={openLead}
							/>
						))}
					</div>
					<DragOverlay dropAnimation={null}>
						{draggingLead ? (
							<div className="w-72 cursor-grabbing">
								<LeadCard lead={draggingLead} />
							</div>
						) : null}
					</DragOverlay>
				</DndContext>
			)}
				</>
			)}
			<CrmLeadDetailSheet lead={sheet.lead} open={sheet.open} onOpenChange={sheet.setOpen} onDeleted={handleLeadDeleted} />
		</div>
	)
}
