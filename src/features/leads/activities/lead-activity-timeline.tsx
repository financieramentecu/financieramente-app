'use client'

import * as React from 'react'
import { MessageSquareText } from 'lucide-react'
import { Separator } from '@/features/shared/ui/separator'
import { Textarea } from '@/features/shared/ui/textarea'
import { Button } from '@/features/shared/ui/button'

interface TimelineApiItem {
	idLeadActivity: number
	type: 'NOTE_ADDED' | 'TASK_CREATED' | 'TASK_COMPLETED' | 'TASK_REASSIGNED' | 'CONVERTED' | 'BUSINESS_LINKED' | 'CASE_OPENED' | 'CASE_UPDATED'
	occurredAt: string
	actorName: string
	payload: { note: string } | { businessId: number } | { taskId: number; title?: string; assignedTo?: number } | { caseId: number; subject?: string; status?: string; action?: 'COMMENTED' }
}
interface TimelineResponse { data?: { items?: TimelineApiItem[] } }

export function LeadActivityTimeline({ leadId, enabled }: { leadId: number; enabled: boolean }) {
	const [items, setItems] = React.useState<TimelineApiItem[]>([])
	const [status, setStatus] = React.useState<'idle' | 'loading' | 'error'>('idle')
	const [note, setNote] = React.useState('')
	const [saving, setSaving] = React.useState(false)
	const [formError, setFormError] = React.useState<string | null>(null)

	const load = React.useCallback(async () => {
		setStatus('loading')
		try {
			const response = await fetch(`/api/leads/${leadId}/activities?limit=25`)
			if (!response.ok) throw new Error()
			const body = (await response.json()) as TimelineResponse
			setItems(body.data?.items ?? [])
			setStatus('idle')
		} catch { setStatus('error') }
	}, [leadId])

	React.useEffect(() => { if (enabled) void load() }, [enabled, load])
	if (!enabled) return null

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!note.trim()) return
		setSaving(true); setFormError(null)
		try {
			const response = await fetch(`/api/leads/${leadId}/activities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'NOTE_ADDED', payload: { note: note.trim() } }) })
			if (!response.ok) throw new Error()
			setNote(''); await load()
		} catch { setFormError('No fue posible guardar la nota. Inténtalo de nuevo.') } finally { setSaving(false) }
	}

	return <section aria-labelledby="lead-timeline-title" className="space-y-3">
		<div className="flex items-center gap-2"><MessageSquareText className="size-4 text-slate-500" aria-hidden /><h3 id="lead-timeline-title" className="text-sm font-semibold">Timeline</h3></div>
		<form onSubmit={submit} className="space-y-2 rounded-md border border-border p-3">
			<label htmlFor={`lead-note-${leadId}`} className="text-sm font-medium">Nueva nota</label>
			<Textarea id={`lead-note-${leadId}`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Registra un seguimiento" disabled={saving} />
			{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
			<Button type="submit" size="sm" disabled={saving || !note.trim()}>{saving ? 'Guardando…' : 'Agregar nota'}</Button>
		</form>
		{status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Cargando actividades…</p>}
		{status === 'error' && <p role="alert" className="text-sm text-destructive">No fue posible cargar la timeline. Inténtalo de nuevo.</p>}
		{status === 'idle' && items.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay actividades para este lead.</p>}
		{items.map((item) => <div key={item.idLeadActivity} className="space-y-1 text-sm"><p className="font-medium">{item.type === 'NOTE_ADDED' ? 'Nota de seguimiento' : item.type === 'CONVERTED' ? 'Lead convertido a negocio' : item.type === 'BUSINESS_LINKED' ? 'Negocio vinculado' : item.type === 'TASK_CREATED' ? 'Tarea creada' : item.type === 'TASK_COMPLETED' ? 'Tarea completada' : item.type === 'TASK_REASSIGNED' ? 'Tarea reasignada' : item.type === 'CASE_OPENED' ? 'Caso de soporte abierto' : item.type === 'CASE_UPDATED' ? 'Caso de soporte actualizado' : 'Actividad'}</p>{'note' in item.payload ? <p className="whitespace-pre-wrap text-foreground">{item.payload.note}</p> : 'businessId' in item.payload ? <p className="text-foreground">Negocio #{item.payload.businessId}</p> : 'caseId' in item.payload ? <p className="text-foreground">{item.payload.subject ?? `Caso #${item.payload.caseId}`}{item.payload.status ? ` · ${item.payload.status}` : ''}</p> : <p className="text-foreground">{item.payload.title ?? `Tarea #${item.payload.taskId}`}</p>}<p className="text-xs text-muted-foreground">{item.actorName} · {new Date(item.occurredAt).toLocaleString('es-CO')}</p><Separator className="mt-3" /></div>)}
	</section>
}
