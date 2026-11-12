'use client'

import * as React from 'react'
import { CheckCircle2, ClipboardCheck } from 'lucide-react'
import { Separator } from '@/features/shared/ui/separator'
import { Input } from '@/features/shared/ui/input'
import { Button } from '@/features/shared/ui/button'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { activityLabelOptions } from '@/features/leads/activities/activity-label-options'
import { fetchActivityLabels } from '@/features/leads/activities/activity-labels-api'
import type { ActivityLabel } from '@/features/leads/activities/activity-label.types'
import { TASK_TYPE_LABELS } from '@/features/leads/agenda/task-type-labels'
import { bogotaLocalDateTimeToIso } from '@/features/leads/tasks/bogota-datetime-input'
import { ResolutionNoteForm } from '@/features/leads/activities/resolution-note-form'
import { ActivityCommentThread } from '@/features/leads/agenda/activity-comment-thread'
import { LeadListSkeleton } from '@/features/leads/components/lead-loading-skeleton'
import { useLeadTasks } from '@/features/leads/tasks/use-lead-tasks'
import type { LeadTaskDto } from '@/features/leads/tasks/lead-tasks-api'
import type { ActivityFinishActions, ActivityFinishState, ActivityFocus } from '@/features/leads/agenda/agenda.types'

const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'

function describeTaskStatus(task: LeadTaskDto): string {
	if (task.status === 'DONE') return 'Completada'
	if (task.status === 'CANCELLED') return 'Cancelada'
	return task.dueAt ? `Vence ${formatDateTimeBogota(task.dueAt)}` : 'Sin fecha límite'
}

export function LeadTaskList({
	leadId,
	assigneeId,
	enabled,
	commentFocus = null,
	onCommented,
	focusOnly = false,
	finishActions,
	onFinishState,
}: {
	leadId: number
	assigneeId?: number | null
	enabled: boolean
	commentFocus?: ActivityFocus | null
	onCommented?: () => void
	/** Opened from Actividades: this task only, with its description and a comment composer. */
	focusOnly?: boolean
	finishActions?: { current: ActivityFinishActions | null }
	onFinishState?: (state: ActivityFinishState) => void
}) {
	const { state, create, complete } = useLeadTasks(leadId, enabled)
	const [title, setTitle] = React.useState('')
	const [type, setType] = React.useState('TODO')
	const [labels, setLabels] = React.useState<ActivityLabel[]>([])
	const [dueAt, setDueAt] = React.useState('')
	const [saving, setSaving] = React.useState(false)
	const [completingId, setCompletingId] = React.useState<number | null>(null)
	const [formError, setFormError] = React.useState<string | null>(null)
	const [openComments, setOpenComments] = React.useState<number | null>(commentFocus?.kind === 'task' ? commentFocus.id : null)

	React.useEffect(() => {
		if (commentFocus?.kind === 'task') setOpenComments(commentFocus.id)
	}, [commentFocus])

	React.useEffect(() => {
		if (!enabled) return
		let cancelled = false
		fetchActivityLabels()
			.then((next) => {
				if (!cancelled) setLabels(next)
			})
			.catch(() => {
				if (!cancelled) setLabels([])
			})
		return () => {
			cancelled = true
		}
	}, [enabled])

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!title.trim() || !assigneeId) return
		const dueIso = dueAt ? bogotaLocalDateTimeToIso(dueAt) : null
		if (dueAt && !dueIso) {
			setFormError('La fecha de vencimiento no es válida.')
			return
		}
		setSaving(true)
		setFormError(null)
		const selected = activityLabelOptions(labels).find((option) => option.value === type) ?? activityLabelOptions(labels)[0]
		const created = await create({
			title: title.trim(),
			assignedTo: assigneeId,
			type: selected.code,
			...(selected.idLeadActivityLabel ? { idLeadActivityLabel: selected.idLeadActivityLabel } : {}),
			...(dueIso ? { dueAt: dueIso } : {}),
		})
		setSaving(false)
		if (created) {
			setTitle('')
			setDueAt('')
			setType('TODO')
		} else {
			setFormError('No fue posible crear la tarea. Inténtalo de nuevo.')
		}
	}

	async function handleComplete(idLeadTask: number, comment: string, files: File[]) {
		setSaving(true)
		setFormError(null)
		const done = await complete(idLeadTask, {
			...(comment ? { comment } : {}),
			...(files.length > 0 ? { files } : {}),
		})
		setSaving(false)
		if (done) setCompletingId(null)
		else setFormError('No fue posible completar la tarea. Inténtalo de nuevo.')
	}

	const options = activityLabelOptions(labels)
	const tasks = state.status === 'success' ? state.data : []
	const visibleTasks = focusOnly
		? tasks.filter((task) => commentFocus?.kind === 'task' && task.idLeadTask === commentFocus.id)
		: tasks
	const focusedTask = focusOnly ? visibleTasks[0] : undefined

	if (focusOnly && finishActions) {
		finishActions.current = focusedTask
			? {
				start: () => setCompletingId(focusedTask.idLeadTask),
				cancel: () => setCompletingId(null),
				submit: (comment, files) => { void handleComplete(focusedTask.idLeadTask, comment, files) },
			}
			: null
	}

	React.useEffect(() => {
		if (!focusOnly || !onFinishState) return
		if (state.status === 'loading' || state.status === 'idle') {
			onFinishState({ status: 'loading', drafting: false, pending: saving, includeCloseDate: false })
			return
		}
		if (!focusedTask) {
			onFinishState({ status: 'missing', drafting: false, pending: saving, includeCloseDate: false })
			return
		}
		onFinishState({
			status: focusedTask.status === 'OPEN' ? 'open' : 'closed',
			drafting: completingId === focusedTask.idLeadTask,
			pending: saving,
			includeCloseDate: false,
		})
	}, [focusOnly, onFinishState, state.status, focusedTask, completingId, saving])

	if (!enabled) return null

	return (
		<section aria-label={focusOnly ? 'Actividad' : undefined} aria-labelledby={focusOnly ? undefined : 'lead-tasks-title'} className="space-y-3">
			{!focusOnly && (
				<div className="flex items-center gap-2">
					<ClipboardCheck className="size-4 text-slate-500" aria-hidden />
					<h3 id="lead-tasks-title" className="text-sm font-semibold">Próximas tareas</h3>
				</div>
			)}
			{!focusOnly && (
			<form onSubmit={submit} className="space-y-2 rounded-md border border-border p-3">
				<label htmlFor={`lead-task-${leadId}`} className="text-sm font-medium">Nueva tarea</label>
				<Input id={`lead-task-${leadId}`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} placeholder="Ej. Llamar para confirmar" disabled={saving || !assigneeId} />
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1">
						<label htmlFor={`lead-task-type-${leadId}`} className="text-xs text-muted-foreground">Tipo</label>
						<select id={`lead-task-type-${leadId}`} className={SELECT_CLASS} value={options.some((option) => option.value === type) ? type : options[0].value} disabled={saving || !assigneeId} onChange={(event) => setType(event.target.value)}>
							{options.map((option) => <option key={option.value} value={option.value}>{option.name}</option>)}
						</select>
					</div>
					<div className="space-y-1">
						<label htmlFor={`lead-task-due-${leadId}`} className="text-xs text-muted-foreground">Vence (hora Bogotá)</label>
						<Input id={`lead-task-due-${leadId}`} type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} disabled={saving || !assigneeId} />
					</div>
				</div>
				{!assigneeId && <p className="text-xs text-muted-foreground">Asigna un responsable al lead antes de crear tareas.</p>}
				{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
				<Button type="submit" size="sm" disabled={saving || !title.trim() || !assigneeId}>{saving ? 'Creando…' : 'Crear tarea'}</Button>
			</form>
			)}
			{state.status === 'loading' && (
				<LeadListSkeleton label={focusOnly ? 'Cargando la actividad…' : 'Cargando tareas…'} rows={focusOnly ? 1 : 3} />
			)}
			{state.status === 'error' && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
			{focusOnly && formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
			{state.status === 'success' && visibleTasks.length === 0 && (
				<p className="text-sm text-muted-foreground">
					{focusOnly ? 'No se encontró la actividad.' : 'No hay tareas de seguimiento para este lead.'}
				</p>
			)}
			{visibleTasks.map((task) => (
				<div key={task.idLeadTask} className="space-y-1 text-sm">
					{focusOnly ? (
						<div className="space-y-1">
							<p className="text-xs font-medium text-muted-foreground">Descripción</p>
							<p className="font-medium">{task.title}</p>
							<p className="text-xs text-muted-foreground">
								{task.typeLabel ?? TASK_TYPE_LABELS[task.type ?? 'TODO']} · {describeTaskStatus(task)} · {[task.assignee.name, task.assignee.lastName].filter(Boolean).join(' ')}
							</p>
						</div>
					) : (
						<div className="flex items-center justify-between gap-2">
							<p className="flex items-center gap-2 font-medium">
								<CheckCircle2 className="size-4 text-slate-500" aria-hidden />
								{task.title}
								<span className="text-xs font-normal text-muted-foreground">{task.typeLabel ?? TASK_TYPE_LABELS[task.type ?? 'TODO']}</span>
							</p>
							<span className="flex shrink-0 gap-1">
								<Button
									type="button"
									size="sm"
									variant="outline"
									aria-expanded={openComments === task.idLeadTask}
									onClick={() => setOpenComments((current) => (current === task.idLeadTask ? null : task.idLeadTask))}
								>
									Comentarios
								</Button>
								{task.status === 'OPEN' && completingId !== task.idLeadTask && (
									<Button type="button" size="sm" onClick={() => setCompletingId(task.idLeadTask)} aria-label={`Completar ${task.title}`}>
										Completar
									</Button>
								)}
							</span>
						</div>
					)}
					{!focusOnly && <p className="text-xs text-muted-foreground">{describeTaskStatus(task)} · {[task.assignee.name, task.assignee.lastName].filter(Boolean).join(' ')}</p>}
					{focusOnly && (
						<ActivityCommentThread focus={{ kind: 'task', id: task.idLeadTask }} onChanged={onCommented} />
					)}
					{!focusOnly && openComments === task.idLeadTask && (
						<ActivityCommentThread focus={{ kind: 'task', id: task.idLeadTask }} onChanged={onCommented} />
					)}
					{!focusOnly && completingId === task.idLeadTask && (
						<ResolutionNoteForm
							id={`task-${task.idLeadTask}`}
							submitLabel="Completar tarea"
							pendingLabel="Completando…"
							saving={saving}
							onCancel={() => setCompletingId(null)}
							onSubmit={(comment, files) => void handleComplete(task.idLeadTask, comment, files)}
						/>
					)}
					<Separator className="mt-3" />
				</div>
			))}
		</section>
	)
}
