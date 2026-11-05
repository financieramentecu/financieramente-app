'use client'

import * as React from 'react'
import { CheckCircle2, ClipboardCheck } from 'lucide-react'
import { Separator } from '@/features/shared/ui/separator'
import { Input } from '@/features/shared/ui/input'
import { Button } from '@/features/shared/ui/button'

interface LeadTask { idLeadTask: number; title: string; dueAt: string | null; status: 'OPEN' | 'DONE' | 'CANCELLED'; assignedTo: number; completedAt: string | null; assignee: { name: string; lastName: string | null } }
interface TasksResponse { data?: LeadTask[] }
export function LeadTaskList({ leadId, assigneeId, enabled }: { leadId: number; assigneeId?: number | null; enabled: boolean }) {
	const [tasks, setTasks] = React.useState<LeadTask[]>([]); const [status, setStatus] = React.useState<'idle' | 'loading' | 'error'>('idle'); const [title, setTitle] = React.useState(''); const [saving, setSaving] = React.useState(false); const [formError, setFormError] = React.useState<string | null>(null)
	const load = React.useCallback(async () => { setStatus('loading'); try { const response = await fetch(`/api/leads/${leadId}/tasks`); if (!response.ok) throw new Error(); const body = (await response.json()) as TasksResponse; setTasks(body.data ?? []); setStatus('idle') } catch { setStatus('error') } }, [leadId])
	React.useEffect(() => { if (enabled) void load() }, [enabled, load])
	if (!enabled) return null
	async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!title.trim() || !assigneeId) return; setSaving(true); setFormError(null); try { const response = await fetch(`/api/leads/${leadId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), assignedTo: assigneeId }) }); if (!response.ok) throw new Error(); setTitle(''); await load() } catch { setFormError('No fue posible crear la tarea. Inténtalo de nuevo.') } finally { setSaving(false) } }
	return <section aria-labelledby="lead-tasks-title" className="space-y-3"><div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-slate-500" aria-hidden /><h3 id="lead-tasks-title" className="text-sm font-semibold">Próximas tareas</h3></div>
		<form onSubmit={submit} className="space-y-2 rounded-md border border-border p-3"><label htmlFor={`lead-task-${leadId}`} className="text-sm font-medium">Nueva tarea</label><Input id={`lead-task-${leadId}`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} placeholder="Ej. Llamar para confirmar" disabled={saving || !assigneeId} />{!assigneeId && <p className="text-xs text-muted-foreground">Asigna un responsable al lead antes de crear tareas.</p>}{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}<Button type="submit" size="sm" disabled={saving || !title.trim() || !assigneeId}>{saving ? 'Creando…' : 'Crear tarea'}</Button></form>
		{status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Cargando tareas…</p>}{status === 'error' && <p role="alert" className="text-sm text-destructive">No fue posible cargar las tareas. Inténtalo de nuevo.</p>}{status === 'idle' && tasks.length === 0 && <p className="text-sm text-muted-foreground">No hay tareas de seguimiento para este lead.</p>}{tasks.map((task) => <div key={task.idLeadTask} className="space-y-1 text-sm"><p className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-4 text-slate-500" aria-hidden />{task.title}</p><p className="text-xs text-muted-foreground">{task.status === 'DONE' ? 'Completada' : task.dueAt ? `Vence ${new Date(task.dueAt).toLocaleDateString('es-CO')}` : 'Sin fecha límite'} · {[task.assignee.name, task.assignee.lastName].filter(Boolean).join(' ')}</p><Separator className="mt-3" /></div>)}</section>
}
