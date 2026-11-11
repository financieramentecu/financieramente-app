'use client'

import { useRef, useState } from 'react'
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCorners,
	pointerWithin,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
	type CollisionDetection,
	type DragEndEvent,
	type DragStartEvent,
} from '@dnd-kit/core'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { CRM_HIERARCHY_EMPTY_MESSAGE, useCrmHierarchyFilter } from '@/features/leads/components/crm-hierarchy-shell'
import { AGENDA_BUCKETS, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import { ACTIVITY_COLUMN_LABELS, activityBucket } from '@/features/leads/agenda/activity-bucket'
import { TASK_TYPE_LABELS } from '@/features/leads/agenda/task-type-labels'
import { useActivityBoard } from '@/features/leads/agenda/use-activity-agenda'
import { parsePrefixedId } from '@/features/leads/lib/parse-board-drag-id'
import type { ActivityBoardTaskDto } from '@/features/leads/agenda/agenda.types'
import { cn } from '@/lib/utils'

const kanbanCollision: CollisionDetection = (args) => {
	const hits = pointerWithin(args)
	return hits.length > 0 ? hits : closestCorners(args)
}

function parseBucketId(value: unknown): AgendaBucket | null {
	if (typeof value !== 'string' || !value.startsWith('bucket:')) return null
	const bucket = value.slice('bucket:'.length)
	return (AGENDA_BUCKETS as readonly string[]).includes(bucket) ? (bucket as AgendaBucket) : null
}

function ActivityCard({ task, onOpenLead }: { task: ActivityBoardTaskDto; onOpenLead: (idLead: number) => void }) {
	return (
		<article className="space-y-2 rounded-md border border-border bg-white p-3 shadow-sm dark:bg-slate-900">
			<div className="flex items-start justify-between gap-2">
				<p className="text-sm font-medium leading-snug">{task.title}</p>
				<span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium">{TASK_TYPE_LABELS[task.type]}</span>
			</div>
			<button type="button" className="block truncate text-left text-xs underline-offset-2 hover:underline" onClick={() => onOpenLead(task.idLead)}>
				{task.leadName}
			</button>
			<p className="text-xs text-muted-foreground">
				{task.assigneeName}
				{task.dueAt ? ` · ${formatDateTimeBogota(task.dueAt)}` : ''}
			</p>
		</article>
	)
}

function DraggableActivity({
	task,
	onOpenLead,
}: {
	task: ActivityBoardTaskDto
	onOpenLead: (idLead: number) => void
}) {
	const { listeners, setNodeRef, isDragging } = useDraggable({ id: `task:${task.idLeadTask}` })
	return (
		<div ref={setNodeRef} className={isDragging ? 'cursor-grabbing opacity-40' : 'cursor-grab touch-none'} {...listeners}>
			<ActivityCard task={task} onOpenLead={onOpenLead} />
		</div>
	)
}

function ActivityColumn({
	bucket,
	tasks,
	onOpenLead,
}: {
	bucket: AgendaBucket
	tasks: ActivityBoardTaskDto[]
	onOpenLead: (idLead: number) => void
}) {
	const { setNodeRef, isOver } = useDroppable({ id: `bucket:${bucket}` })
	return (
		<section
			ref={setNodeRef}
			className={cn(
				'flex min-h-80 w-72 shrink-0 flex-col overflow-hidden rounded-lg border-2 border-primary/25 bg-primary/5',
				isOver && 'ring-2 ring-primary ring-offset-2'
			)}
			aria-labelledby={`activity-column-${bucket}`}
		>
			<div className="flex items-center justify-between gap-2 border-b-2 border-primary/25 bg-primary px-3 py-2.5">
				<h3 id={`activity-column-${bucket}`} className="truncate text-sm font-semibold text-white">
					{ACTIVITY_COLUMN_LABELS[bucket]}
				</h3>
				<span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-primary shadow-sm">{tasks.length}</span>
			</div>
			<div className="flex min-h-64 flex-1 flex-col gap-2 p-3">
				{tasks.map((task) => (
					<DraggableActivity key={task.idLeadTask} task={task} onOpenLead={onOpenLead} />
				))}
				{tasks.length === 0 && <p className="px-1 text-xs text-slate-600 dark:text-slate-400">Sin actividades</p>}
			</div>
		</section>
	)
}

/** Activities Kanban: the four time columns, movable by drag and drop. */
export function ActivitiesAgenda({ onOpenLead }: { onOpenLead: (idLead: number) => void }) {
	const hierarchy = useCrmHierarchyFilter()
	const { state, place } = useActivityBoard(hierarchy.ownerIds, !hierarchy.ready || hierarchy.noneSelected)
	const [dragging, setDragging] = useState<ActivityBoardTaskDto | null>(null)
	const skipClick = useRef(false)
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
	const now = new Date()

	function finishDrag() {
		setDragging(null)
		window.setTimeout(() => {
			skipClick.current = false
		}, 0)
	}

	function openLead(idLead: number) {
		if (skipClick.current) return
		onOpenLead(idLead)
	}

	function handleDragStart(event: DragStartEvent) {
		skipClick.current = true
		const idLeadTask = parsePrefixedId(event.active.id, 'task:')
		if (!idLeadTask || state.status !== 'success') return
		setDragging(state.data.find((task) => task.idLeadTask === idLeadTask) ?? null)
	}

	function handleDragEnd(event: DragEndEvent) {
		finishDrag()
		const idLeadTask = parsePrefixedId(event.active.id, 'task:')
		const bucket = parseBucketId(event.over?.id)
		if (!idLeadTask || !bucket) return
		void place(idLeadTask, bucket)
	}

	const grouped = state.status === 'success' ? state.data : []

	return (
		<div className="space-y-4">
			{hierarchy.noneSelected ? (
				<p className="text-sm text-muted-foreground">{CRM_HIERARCHY_EMPTY_MESSAGE}</p>
			) : (
				<>
					{(state.status === 'loading' || state.status === 'idle') && (
						<p role="status" className="text-sm text-muted-foreground">Cargando actividades…</p>
					)}
					{state.status === 'error' && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
					{state.status === 'success' && (
						<DndContext
							sensors={sensors}
							collisionDetection={kanbanCollision}
							onDragStart={handleDragStart}
							onDragCancel={finishDrag}
							onDragEnd={handleDragEnd}
						>
							<div className="flex gap-4 overflow-x-auto pb-4">
								{AGENDA_BUCKETS.map((bucket) => (
									<ActivityColumn
										key={bucket}
										bucket={bucket}
										tasks={grouped.filter((task) => activityBucket(task, now) === bucket)}
										onOpenLead={openLead}
									/>
								))}
							</div>
							<DragOverlay dropAnimation={null}>
								{dragging ? (
									<div className="w-72 cursor-grabbing">
										<ActivityCard task={dragging} onOpenLead={() => undefined} />
									</div>
								) : null}
							</DragOverlay>
						</DndContext>
					)}
				</>
			)}
		</div>
	)
}
