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
import { Button } from '@/features/shared/ui/button'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { ACTIVITY_COLUMN_CODE } from '@/features/leads/agenda/activity-column.types'
import { placedColumn } from '@/features/leads/agenda/activity-bucket'
import { ActivityColumnSettings } from '@/features/leads/agenda/activity-column-settings'
import { useActivityColumns } from '@/features/leads/agenda/use-activity-columns'
import { TASK_TYPE_LABELS } from '@/features/leads/agenda/task-type-labels'
import { activityDueCardText, isActivityOverdue } from '@/features/leads/agenda/activity-due-label'
import { ActivityLabelSettings } from '@/features/leads/activities/activity-label-settings'
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

function activityOf(card: ActivityCardModel) {
	if (card.kind === 'task') return card.task
	return { ...caseAsTask(card.supportCase), columnCode: card.supportCase.columnCode }
}

function cardFocus(card: ActivityCardModel): ActivityFocus {
	return card.kind === 'task'
		? { kind: 'task', id: card.task.idLeadTask }
		: { kind: 'case', id: card.supportCase.idLeadSupportCase }
}

function parseBucketId(value: unknown): string | null {
	if (typeof value !== 'string' || !value.startsWith('bucket:')) return null
	const code = value.slice('bucket:'.length)
	return ACTIVITY_COLUMN_CODE.test(code) ? code : null
}

function parseDragId(value: unknown): ActivityFocus | null {
	const taskId = parsePrefixedId(value, 'task:')
	if (taskId) return { kind: 'task', id: taskId }
	const caseId = parsePrefixedId(value, 'case:')
	if (caseId) return { kind: 'case', id: caseId }
	return null
}

function ActivityTypeBadge({ label, color }: { label: string; color?: string }) {
	return (
		<span
			className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium"
			style={color ? { borderColor: color, color } : undefined}
		>
			{label}
		</span>
	)
}

function ActivityDueBadge({ dueAt, prefix, closed }: { dueAt: string | null; prefix: 'Vence' | 'SLA'; closed: boolean }) {
	const overdue = isActivityOverdue(dueAt, new Date(), closed)
	return (
		<span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium', overdue && 'border-destructive text-destructive')}>
			{activityDueCardText(dueAt, prefix)}
		</span>
	)
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
	onOpenLead: (idLead: number, leadName: string) => void
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
					<div className="flex shrink-0 flex-col items-end gap-1">
						<ActivityTypeBadge label={task.typeLabel ?? TASK_TYPE_LABELS[task.type]} color={task.typeColor} />
						<ActivityDueBadge dueAt={task.dueAt} prefix="Vence" closed={task.status !== 'OPEN'} />
					</div>
				</div>
				<p className="text-xs text-muted-foreground">{TASK_STATUS_LABELS[task.status]}</p>
				<LeadName name={task.leadName} onOpen={() => onOpenLead(task.idLead, task.leadName)} />
				<p className="text-xs text-muted-foreground">Responsable: {task.assigneeName}</p>
				<p className="text-xs text-muted-foreground">Creada por: {task.creatorName}</p>
				<p className="text-xs text-muted-foreground">Creada: {formatDateTimeBogota(task.createdAt)}</p>
				{task.completedAt && <p className="text-xs text-muted-foreground">Completada: {formatDateTimeBogota(task.completedAt)}</p>}
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
				<div className="flex shrink-0 flex-col items-end gap-1">
					<ActivityTypeBadge label="Caso" />
					<ActivityDueBadge
						dueAt={supportCase.dueAt}
						prefix="SLA"
						closed={supportCase.status === 'RESOLVED' || supportCase.status === 'CLOSED'}
					/>
				</div>
			</div>
			<p className="text-xs text-muted-foreground">
				{CASE_STATUS_LABELS[supportCase.status]} · {CASE_PRIORITY_LABELS[supportCase.priority]}
			</p>
			<LeadName name={supportCase.leadName} onOpen={() => onOpenLead(supportCase.idLead, supportCase.leadName)} />
			<p className="text-xs text-muted-foreground">Responsable: {supportCase.assigneeName}</p>
			<p className="text-xs text-muted-foreground">Creado: {formatDateTimeBogota(supportCase.createdAt)}</p>
			{supportCase.resolvedAt && <p className="text-xs text-muted-foreground">Cierre: {formatDateTimeBogota(supportCase.resolvedAt)}</p>}
		</article>
	)
}

function DraggableActivity({
	card,
	onOpenLead,
	onOpen,
}: {
	card: ActivityCardModel
	onOpenLead: (idLead: number, leadName: string) => void
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
	title,
	cards,
	onOpenLead,
	onOpen,
}: {
	bucket: string
	title: string
	cards: ActivityCardModel[]
	onOpenLead: (idLead: number, leadName: string) => void
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
					{title}
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

/** Activities Kanban. Due-date columns fill themselves; a custom column receives dropped cards. */
export function ActivitiesAgenda({
	onOpenLead,
	onOpenActivity,
	refreshKey = 0,
	canConfigure = false,
}: {
	onOpenLead: (idLead: number, leadName: string) => void
	onOpenActivity: (idLead: number, focus: ActivityFocus, leadName: string) => void
	refreshKey?: number
	canConfigure?: boolean
}) {
	const columns = useActivityColumns(true)
	const { state, place } = useActivityBoard([], false, refreshKey)
	const [dragging, setDragging] = useState<ActivityCardModel | null>(null)
	const [kindFilter, setKindFilter] = useState<ActivityKindFilter>('all')
	const skipClick = useRef(false)
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
	const now = new Date()

	function finishDrag() {
		setDragging(null)
		window.setTimeout(() => {
			skipClick.current = false
		}, 0)
	}

	function openLead(idLead: number, leadName: string) {
		if (skipClick.current) return
		onOpenLead(idLead, leadName)
	}

	function openCard(next: ActivityFocus) {
		if (skipClick.current || state.status !== 'success') return
		if (next.kind === 'task') {
			const task = state.data.tasks.find((item) => item.idLeadTask === next.id)
			if (task) onOpenActivity(task.idLead, next, task.leadName)
			return
		}
		const supportCase = state.data.cases.find((item) => item.idLeadSupportCase === next.id)
		if (supportCase) onOpenActivity(supportCase.idLead, next, supportCase.leadName)
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

	return (
		<div className="space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-2">
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
						{canConfigure && (
							<div className="flex flex-wrap gap-2">
								<ActivityColumnSettings
									state={columns.state}
									actionError={columns.actionError}
									onSave={columns.save}
									onAdd={columns.add}
									onRemove={columns.remove}
								/>
								<ActivityLabelSettings />
							</div>
						)}
					</div>
					{(state.status === 'loading' || state.status === 'idle') && (
						<div role="status" aria-busy="true" className="flex gap-4 overflow-x-auto pb-4">
							<span className="sr-only">Cargando actividades…</span>
							{columns.columns.map((column) => (
								<section
									key={column.code}
									className="flex min-h-80 w-72 shrink-0 flex-col overflow-hidden rounded-lg border-2 border-primary/25 bg-primary/5"
									aria-label={column.name}
								>
									<div className="border-b-2 border-primary/25 bg-primary px-3 py-2.5">
										<h3 className="text-sm font-semibold text-white">{column.name}</h3>
									</div>
									<div className="flex flex-col gap-2 p-3">
										<Skeleton className="h-20 w-full bg-white/80" />
										<Skeleton className="h-20 w-full bg-white/80" />
									</div>
								</section>
							))}
						</div>
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
								{columns.columns.map((column) => (
									<ActivityColumn
										key={column.code}
										bucket={column.code}
										title={column.name}
										cards={cards.filter((card) => placedColumn(activityOf(card), columns.columns, now) === column.code)}
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
		</div>
	)
}
