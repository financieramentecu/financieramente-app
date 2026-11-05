'use client'

import * as React from 'react'
import { LifeBuoy } from 'lucide-react'
import { Badge } from '@/features/shared/ui/badge'
import { Separator } from '@/features/shared/ui/separator'
import { Input } from '@/features/shared/ui/input'
import { Button } from '@/features/shared/ui/button'

type SupportCase = { idLeadSupportCase: number; subject: string; status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; dueAt: string | null }
interface CasesResponse { data?: SupportCase[] }
const statusLabel: Record<SupportCase['status'], string> = { OPEN: 'Abierto', IN_PROGRESS: 'En proceso', WAITING: 'En espera', RESOLVED: 'Resuelto', CLOSED: 'Cerrado' }
const priorityLabel: Record<SupportCase['priority'], string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' }

export function LeadSupportCaseList({ leadId, enabled }: { leadId: number; enabled: boolean }) {
  const [cases, setCases] = React.useState<SupportCase[]>([]); const [status, setStatus] = React.useState<'idle' | 'loading' | 'error'>('idle'); const [subject, setSubject] = React.useState(''); const [priority, setPriority] = React.useState<SupportCase['priority']>('MEDIUM'); const [saving, setSaving] = React.useState(false); const [formError, setFormError] = React.useState<string | null>(null)
  const load = React.useCallback(async () => { setStatus('loading'); try { const response = await fetch(`/api/leads/${leadId}/cases`); if (!response.ok) throw new Error(); const body = (await response.json()) as CasesResponse; setCases(body.data ?? []); setStatus('idle') } catch { setStatus('error') } }, [leadId])
  React.useEffect(() => { if (enabled) void load() }, [enabled, load])
  if (!enabled) return null
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!subject.trim()) return; setSaving(true); setFormError(null); try { const response = await fetch(`/api/leads/${leadId}/cases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: subject.trim(), priority }) }); if (!response.ok) throw new Error(); setSubject(''); setPriority('MEDIUM'); await load() } catch { setFormError('No fue posible abrir el caso. Inténtalo de nuevo.') } finally { setSaving(false) } }
  return <section aria-labelledby="lead-support-cases-title" className="space-y-3"><div className="flex items-center gap-2"><LifeBuoy className="size-4 text-slate-500" aria-hidden /><h3 id="lead-support-cases-title" className="text-sm font-semibold">Casos de soporte</h3></div>
    <form onSubmit={submit} className="space-y-2 rounded-md border border-border p-3"><label htmlFor={`lead-case-${leadId}`} className="text-sm font-medium">Asunto del caso</label><Input id={`lead-case-${leadId}`} value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={240} placeholder="Describe la solicitud" disabled={saving} /><label htmlFor={`lead-case-priority-${leadId}`} className="text-sm font-medium">Prioridad</label><select id={`lead-case-priority-${leadId}`} value={priority} onChange={(event) => setPriority(event.target.value as SupportCase['priority'])} disabled={saving} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select>{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}<Button type="submit" size="sm" disabled={saving || !subject.trim()}>{saving ? 'Abriendo…' : 'Abrir caso'}</Button></form>
    {status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Cargando casos…</p>}{status === 'error' && <p role="alert" className="text-sm text-destructive">No fue posible cargar los casos. Inténtalo de nuevo.</p>}{status === 'idle' && cases.length === 0 && <p className="text-sm text-muted-foreground">No hay casos de soporte para este lead.</p>}{cases.map((supportCase) => <div key={supportCase.idLeadSupportCase} className="space-y-1 text-sm"><p className="font-medium">{supportCase.subject}</p><div className="flex flex-wrap gap-2"><Badge variant="outline">{statusLabel[supportCase.status]}</Badge><Badge variant="secondary">{priorityLabel[supportCase.priority]}</Badge></div>{supportCase.dueAt && <p className="text-xs text-muted-foreground">SLA: {new Date(supportCase.dueAt).toLocaleDateString('es-CO')}</p>}<Separator className="mt-3" /></div>)}</section>
}
