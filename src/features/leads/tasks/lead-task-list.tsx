'use client'

import * as React from 'react'
import { CheckCircle2, ClipboardCheck } from 'lucide-react'
import { Separator } from '@/features/shared/ui/separator'
import { Input } from '@/features/shared/ui/input'
import { Button } from '@/features/shared/ui/button'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { LEAD_TASK_TYPES, type LeadTaskKind } from '@/features/leads/tasks/lead-task.schema'
import { TASK_TYPE_LABELS } from '@/features/leads/agenda/task-type-labels'
import { bogotaLocalDateTimeToIso } from '@/features/leads/tasks/bogota-datetime-input'
import { ResolutionNoteForm } from '@/features/leads/activities/resolution-note-form'
import { useLeadTasks } from '@/features/leads/tasks/use-lead-tasks'
import type { LeadTaskDto } from '@/features/leads/tasks/lead-tasks-api'

const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'

function describeTaskStatus(task: LeadTaskDto): string {
	if (task.status === 'DONE') return 'Completada'
	if (task.status === 'CANCELLED') return 'Cancelada'
	return task.dueAt ? `Vence ${formatDateTimeBogota(task.dueAt)}` : 'Sin fecha límite'
}

export function LeadTaskList({ leadId, assigneeId, enabled }: { leadId: number; assigneeId?: number | null; enabled: boolean }) {
	const { state, create, complete } = useLeadTasks(leadId, enabled)
	const [title, setTitle] = React.useState('')
	const [type, setType] = React.useState<LeadTaskKind>('TODO')
	const [dueAt, setDueAt] = React.useState('')
	const [saving, setSaving] = React.useState(false)
	const [completingId, setCompletingId] = React.useState<number | null>(null)
	const [formError, setFormError] = React.useState<string | null>(null)
	if (!enabled) return null

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
		const created = await create({ title: title.trim(), assignedTo: assigneeId, type, ...(dueIso ? { dueAt: dueIso } : {}) })
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

	const tasks = state.status === 'success' ? state.data : []

	return (
		<section aria-labelledby="lead-tasks-title" className="space-y-3">
			<div className="flex items-center gap-2">
				<ClipboardCheck className="size-4 text-slate-500" aria-hidden />
				<h3 id="lead-tasks-title" className="text-sm font-semibold">Próximas tareas</h3>
			</div>
			<form onSubmit={submit} className="space-y-2 rounded-md border border-border p-3">
				<label htmlFor={`lead-task-${leadId}`} className="text-sm font-medium">Nueva tarea</label>
				<Input id={`lead-task-${leadId}`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} placeholder="Ej. Llamar para confirmar" disabled={saving || !assigneeId} />
				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1">
						<label htmlFor={`lead-task-type-${leadId}`} className="text-xs text-muted-foreground">Tipo</label>
						<select id={`lead-task-type-${leadId}`} className={SELECT_CLASS} value={type} disabled={saving || !assigneeId} onChange={(event) => setType(event.target.value as LeadTaskKind)}>
							{LEAD_TASK_TYPES.map((value) => <option key={value} value={value}>{TASK_TYPE_LABELS[value]}</option>)}
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
			{state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Cargando tareas…</p>}
			{state.status === 'error' && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
			{state.status === 'success' && tasks.length === 0 && <p className="text-sm text-muted-foreground">No hay tareas de seguimiento para este lead.</p>}
			{tasks.map((task) => (
				<div key={task.idLeadTask} className="space-y-1 text-sm">
					<div className="flex items-center justify-between gap-2">
						<p className="flex items-center gap-2 font-medium">
							<CheckCircle2 className="size-4 text-slate-500" aria-hidden />
							{task.title}
							<span className="text-xs font-normal text-muted-foreground">{TASK_TYPE_LABELS[task.type ?? 'TODO']}</span>
						</p>
						{task.status === 'OPEN' && completingId !== task.idLeadTask && (
							<Button type="button" size="sm" onClick={() => setCompletingId(task.idLeadTask)} aria-label={`Completar ${task.title}`}>
								Completar
							</Button>
						)}
					</div>
					<p className="text-xs text-muted-foreground">{describeTaskStatus(task)} · {[task.assignee.name, task.assignee.lastName].filter(Boolean).join(' ')}</p>
					{completingId === task.idLeadTask && (
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
