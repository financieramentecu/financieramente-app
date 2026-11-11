'use client'

import { useEffect, useRef, useState } from 'react'
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
import { Button } from '@/features/shared/ui/button'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { CRM_HIERARCHY_EMPTY_MESSAGE, useCrmHierarchyFilter } from '@/features/leads/components/crm-hierarchy-shell'
import { AGENDA_BUCKETS, type AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'
import { ACTIVITY_COLUMN_LABELS, activityBucket } from '@/features/leads/agenda/activity-bucket'
import { TASK_TYPE_LABELS } from '@/features/leads/agenda/task-type-labels'
import { ActivityWorkPanel } from '@/features/leads/agenda/activity-work-panel'
import { caseAsTask, useActivityBoard } from '@/features/leads/agenda/use-activity-agenda'
import { parsePrefixedId } from '@/features/leads/lib/parse-board-drag-id'
import type {
	ActivityBoardCaseDto,
	ActivityBoardTaskDto,
	ActivityCasePriority,
	ActivityCaseStatus,
	ActivityFocus,
} from '@/features/leads/agenda/agenda.types'
import { cn } from '@/lib/utils'

const kanbanCollision: CollisionDetection = (args) => {
	const hits = pointerWithin(args)
	return hits.length > 0 ? hits : closestCorners(args)
}

const TASK_STATUS_LABELS = { OPEN: 'Abierta', DONE: 'Completada', CANCELLED: 'Cancelada' } as const
const CASE_STATUS_LABELS: Record<ActivityCaseStatus, string> = {
	OPEN: 'Abierto',
	IN_PROGRESS: 'En proceso',
	WAITING: 'En espera',
	RESOLVED: 'Resuelto',
	CLOSED: 'Cerrado',
}
const CASE_PRIORITY_LABELS: Record<ActivityCasePriority, string> = {
	LOW: 'Prioridad baja',
	MEDIUM: 'Prioridad media',
	HIGH: 'Prioridad alta',
	URGENT: 'Prioridad urgente',
}

type ActivityCardModel =
	| { kind: 'task'; task: ActivityBoardTaskDto }
	| { kind: 'case'; supportCase: ActivityBoardCaseDto }

type ActivityKindFilter = 'all' | 'task' | 'case'

const KIND_FILTERS: { id: ActivityKindFilter; label: string }[] = [
	{ id: 'all', label: 'Todas' },
	{ id: 'task', label: 'Tareas' },
	{ id: 'case', label: 'Casos' },
]

function commentLabel(count: number): string {
	if (count === 0) return 'Sin comentarios'
	if (count === 1) return '1 comentario'
	return `${count} comentarios`
}

function cardFocus(card: ActivityCardModel): ActivityFocus {
	return card.kind === 'task'
		? { kind: 'task', id: card.task.idLeadTask }
		: { kind: 'case', id: card.supportCase.idLeadSupportCase }
}

function cardTitle(card: ActivityCardModel): string {
	return card.kind === 'task' ? card.task.title : card.supportCase.subject
}

function cardCanComplete(card: ActivityCardModel): boolean {
	if (card.kind === 'task') return card.task.status === 'OPEN'
	return card.supportCase.status !== 'RESOLVED' && card.supportCase.status !== 'CLOSED'
}

function parseBucketId(value: unknown): AgendaBucket | null {
	if (typeof value !== 'string' || !value.startsWith('bucket:')) return null
	const bucket = value.slice('bucket:'.length)
	return (AGENDA_BUCKETS as readonly string[]).includes(bucket) ? (bucket as AgendaBucket) : null
}

function parseDragId(value: unknown): ActivityFocus | null {
	const taskId = parsePrefixedId(value, 'task:')
	if (taskId) return { kind: 'task', id: taskId }
	const caseId = parsePrefixedId(value, 'case:')
	if (caseId) return { kind: 'case', id: caseId }
	return null
}

function LeadName({ name, onOpen }: { name: string; onOpen: () => void }) {
	return (
		<button
			type="button"
			className="block truncate text-left text-xs underline-offset-2 hover:underline"
			onClick={(event) => {
				event.stopPropagation()
				onOpen()
			}}
		>
			{name}
		</button>
	)
}

function ActivityCard({
	card,
	onOpenLead,
	onOpen,
}: {
	card: ActivityCardModel
	onOpenLead: (idLead: number) => void
	onOpen: (focus: ActivityFocus) => void
}) {
	if (card.kind === 'task') {
		const task = card.task
		return (
			<article
				className="space-y-1 rounded-md border border-border bg-white p-3 text-left shadow-sm dark:bg-slate-900"
				onClick={() => onOpen(cardFocus(card))}
			>
				<div className="flex items-start justify-between gap-2">
					<p className="text-sm font-medium leading-snug">{task.title}</p>
					<span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium">Tarea · {TASK_TYPE_LABELS[task.type]}</span>
				</div>
				<p className="text-xs text-muted-foreground">{TASK_STATUS_LABELS[task.status]}</p>
				<LeadName name={task.leadName} onOpen={() => onOpenLead(task.idLead)} />
				<p className="text-xs text-muted-foreground">Responsable: {task.assigneeName}</p>
				<p className="text-xs text-muted-foreground">Creada por: {task.creatorName}</p>
				<p className="text-xs text-muted-foreground">Creada: {formatDateTimeBogota(task.createdAt)}</p>
				<p className="text-xs text-muted-foreground">{task.dueAt ? `Vence: ${formatDateTimeBogota(task.dueAt)}` : 'Sin fecha límite'}</p>
				{task.completedAt && <p className="text-xs text-muted-foreground">Completada: {formatDateTimeBogota(task.completedAt)}</p>}
				<p className="text-xs font-medium text-primary">{commentLabel(task.commentCount)}</p>
			</article>
		)
	}
	const supportCase = card.supportCase
	return (
		<article
			className="space-y-1 rounded-md border border-border bg-white p-3 text-left shadow-sm dark:bg-slate-900"
			onClick={() => onOpen(cardFocus(card))}
		>
			<div className="flex items-start justify-between gap-2">
				<p className="text-sm font-medium leading-snug">{supportCase.subject}</p>
				<span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium">Caso</span>
			</div>
			<p className="text-xs text-muted-foreground">
				{CASE_STATUS_LABELS[supportCase.status]} · {CASE_PRIORITY_LABELS[supportCase.priority]}
			</p>
			<LeadName name={supportCase.leadName} onOpen={() => onOpenLead(supportCase.idLead)} />
			<p className="text-xs text-muted-foreground">Responsable: {supportCase.assigneeName}</p>
			<p className="text-xs text-muted-foreground">Creado: {formatDateTimeBogota(supportCase.createdAt)}</p>
			<p className="text-xs text-muted-foreground">{supportCase.dueAt ? `SLA: ${formatDateTimeBogota(supportCase.dueAt)}` : 'Sin fecha límite'}</p>
			{supportCase.resolvedAt && <p className="text-xs text-muted-foreground">Cierre: {formatDateTimeBogota(supportCase.resolvedAt)}</p>}
			<p className="text-xs font-medium text-primary">{commentLabel(supportCase.commentCount)}</p>
		</article>
	)
}

function DraggableActivity({
	card,
	onOpenLead,
	onOpen,
}: {
	card: ActivityCardModel
	onOpenLead: (idLead: number) => void
	onOpen: (focus: ActivityFocus) => void
}) {
	const focus = cardFocus(card)
	const { listeners, setNodeRef, isDragging } = useDraggable({ id: `${focus.kind}:${focus.id}` })
	return (
		<div ref={setNodeRef} className={isDragging ? 'cursor-grabbing opacity-40' : 'cursor-grab touch-none'} {...listeners}>
			<ActivityCard card={card} onOpenLead={onOpenLead} onOpen={onOpen} />
		</div>
	)
}

function ActivityColumn({
	bucket,
	cards,
	onOpenLead,
	onOpen,
}: {
	bucket: AgendaBucket
	cards: ActivityCardModel[]
	onOpenLead: (idLead: number) => void
	onOpen: (focus: ActivityFocus) => void
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
				<span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-primary shadow-sm">{cards.length}</span>
			</div>
			<div className="flex min-h-64 flex-1 flex-col gap-2 p-3">
				{cards.map((card) => {
					const focus = cardFocus(card)
					return <DraggableActivity key={`${focus.kind}-${focus.id}`} card={card} onOpenLead={onOpenLead} onOpen={onOpen} />
				})}
				{cards.length === 0 && <p className="px-1 text-xs text-slate-600 dark:text-slate-400">Sin actividades</p>}
			</div>
		</section>
	)
}

/** Activities Kanban: tasks and cases in the four time columns. */
export function ActivitiesAgenda({
	onOpenLead,
	focus = null,
}: {
	onOpenLead: (idLead: number) => void
	focus?: ActivityFocus | null
}) {
	const hierarchy = useCrmHierarchyFilter()
	const { state, place, reload } = useActivityBoard(hierarchy.ownerIds, !hierarchy.ready || hierarchy.noneSelected)
	const [dragging, setDragging] = useState<ActivityCardModel | null>(null)
	const [open, setOpen] = useState<ActivityFocus | null>(null)
	const [kindFilter, setKindFilter] = useState<ActivityKindFilter>('all')
	const skipClick = useRef(false)
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
	const now = new Date()

	useEffect(() => {
		if (focus) setOpen(focus)
	}, [focus])

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

	function openCard(next: ActivityFocus) {
		if (skipClick.current) return
		setOpen(next)
	}

	function handleDragStart(event: DragStartEvent) {
		skipClick.current = true
		const dragged = parseDragId(event.active.id)
		if (!dragged || state.status !== 'success') return
		if (dragged.kind === 'task') {
			const task = state.data.tasks.find((item) => item.idLeadTask === dragged.id)
			if (task) setDragging({ kind: 'task', task })
			return
		}
		const supportCase = state.data.cases.find((item) => item.idLeadSupportCase === dragged.id)
		if (supportCase) setDragging({ kind: 'case', supportCase })
	}

	function handleDragEnd(event: DragEndEvent) {
		finishDrag()
		const dragged = parseDragId(event.active.id)
		const bucket = parseBucketId(event.over?.id)
		if (!dragged || !bucket) return
		void place(dragged, bucket)
	}

	const board = state.status === 'success' ? state.data : { tasks: [], cases: [] }
	const cards: ActivityCardModel[] = [
		...(kindFilter === 'case' ? [] : board.tasks.map((task) => ({ kind: 'task' as const, task }))),
		...(kindFilter === 'task' ? [] : board.cases.map((supportCase) => ({ kind: 'case' as const, supportCase }))),
	]
	const openCardModel = open
		? cards.find((card) => {
				const current = cardFocus(card)
				return current.kind === open.kind && current.id === open.id
			})
		: undefined

	return (
		<div className="space-y-4">
			{hierarchy.noneSelected ? (
				<p className="text-sm text-muted-foreground">{CRM_HIERARCHY_EMPTY_MESSAGE}</p>
			) : (
				<>
					<div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar actividades">
						{KIND_FILTERS.map((option) => (
							<Button
								key={option.id}
								type="button"
								size="sm"
								variant={kindFilter === option.id ? 'default' : 'outline'}
								aria-pressed={kindFilter === option.id}
								onClick={() => setKindFilter(option.id)}
							>
								{option.label}
							</Button>
						))}
					</div>
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
										cards={cards.filter((card) => {
											const source = card.kind === 'task' ? card.task : caseAsTask(card.supportCase)
											return activityBucket(source, now) === bucket
										})}
										onOpenLead={openLead}
										onOpen={openCard}
									/>
								))}
							</div>
							<DragOverlay dropAnimation={null}>
								{dragging ? (
									<div className="w-72 cursor-grabbing">
										<ActivityCard card={dragging} onOpenLead={() => undefined} onOpen={() => undefined} />
									</div>
								) : null}
							</DragOverlay>
						</DndContext>
					)}
					{open && (kindFilter === 'all' || open.kind === kindFilter) && (
						<ActivityWorkPanel
							focus={open}
							title={openCardModel ? cardTitle(openCardModel) : open.kind === 'task' ? 'Tarea' : 'Caso'}
							canComplete={openCardModel ? cardCanComplete(openCardModel) : true}
							onClose={() => setOpen(null)}
							onChanged={reload}
						/>
					)}
				</>
			)}
		</div>
	)
}
