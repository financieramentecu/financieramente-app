'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LifeBuoy } from 'lucide-react'
import { Badge } from '@/features/shared/ui/badge'
import { Separator } from '@/features/shared/ui/separator'
import { Input } from '@/features/shared/ui/input'
import { Button } from '@/features/shared/ui/button'
import { formatDateBogota } from '@/features/shared/lib/format-date'
import { dateOnlyToBogotaNoonUtc } from '@/features/negocios/lib/bogota-date'
import { jsonOrFilesInit } from '@/features/leads/activities/json-or-files'
import { ResolutionNoteForm } from '@/features/leads/activities/resolution-note-form'
import type { ActivityFocus } from '@/features/leads/agenda/agenda.types'

type SupportCaseStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
type SupportCasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface SupportCase {
	idLeadSupportCase: number
	subject: string
	status: SupportCaseStatus
	priority: SupportCasePriority
	dueAt: string | null
	resolvedAt: string | null
}

interface CasesResponse {
	data?: SupportCase[]
}

const statusLabel: Record<SupportCaseStatus, string> = {
	OPEN: 'Abierto',
	IN_PROGRESS: 'En proceso',
	WAITING: 'En espera',
	RESOLVED: 'Resuelto',
	CLOSED: 'Cerrado',
}

const priorityLabel: Record<SupportCasePriority, string> = {
	LOW: 'Baja',
	MEDIUM: 'Media',
	HIGH: 'Alta',
	URGENT: 'Urgente',
}

const OPEN_STATUSES = new Set<SupportCaseStatus>(['OPEN', 'IN_PROGRESS', 'WAITING'])

function isOpen(status: SupportCaseStatus): boolean {
	return OPEN_STATUSES.has(status)
}

export function LeadSupportCaseList({
	leadId,
	enabled,
	onView,
}: {
	leadId: number
	enabled: boolean
	onView?: (focus: ActivityFocus) => void
}) {
	const [cases, setCases] = useState<SupportCase[]>([])
	const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
	const [subject, setSubject] = useState('')
	const [priority, setPriority] = useState<SupportCasePriority>('MEDIUM')
	const [saving, setSaving] = useState(false)
	const [closingId, setClosingId] = useState<number | null>(null)
	const [draftId, setDraftId] = useState<number | null>(null)
	const [formError, setFormError] = useState<string | null>(null)
	const [reloadKey, setReloadKey] = useState(0)
	const loadedLeadId = useRef<number | null>(null)

	useEffect(() => {
		if (!enabled) return
		let cancelled = false
		setStatus((current) => (loadedLeadId.current === leadId && current === 'idle' ? current : 'loading'))
		fetch(`/api/leads/${leadId}/cases`)
			.then(async (response) => {
				if (!response.ok) throw new Error()
				const body = (await response.json()) as CasesResponse
				if (!cancelled) {
					loadedLeadId.current = leadId
					setCases(body.data ?? [])
					setStatus('idle')
				}
			})
			.catch(() => {
				if (!cancelled) setStatus('error')
			})
		return () => {
			cancelled = true
		}
	}, [enabled, leadId, reloadKey])

	if (!enabled) return null

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!subject.trim()) return
		setSaving(true)
		setFormError(null)
		try {
			const response = await fetch(`/api/leads/${leadId}/cases`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ subject: subject.trim(), priority }),
			})
			if (!response.ok) throw new Error()
			setSubject('')
			setPriority('MEDIUM')
			setReloadKey((current) => current + 1)
		} catch {
			setFormError('No fue posible abrir el caso. Inténtalo de nuevo.')
		} finally {
			setSaving(false)
		}
	}

	async function closeCase(
		idLeadSupportCase: number,
		comment: string,
		files: File[],
		closeOn?: string
	) {
		setClosingId(idLeadSupportCase)
		setFormError(null)
		const resolvedAt = closeOn ? dateOnlyToBogotaNoonUtc(closeOn).toISOString() : undefined
		const body = {
			status: 'CLOSED' as const,
			...(comment ? { comment } : {}),
			...(resolvedAt ? { resolvedAt } : {}),
		}
		try {
			const response = await fetch(
				`/api/crm/cases/${idLeadSupportCase}`,
				jsonOrFilesInit('PATCH', body, files)
			)
			if (!response.ok) throw new Error()
			setDraftId(null)
			setReloadKey((current) => current + 1)
		} catch {
			setFormError('No fue posible cerrar el caso. Inténtalo de nuevo.')
		} finally {
			setClosingId(null)
		}
	}

	return (
		<section aria-labelledby="lead-support-cases-title" className="space-y-3">
			<div className="flex items-center gap-2">
				<LifeBuoy className="size-4 text-slate-500" aria-hidden />
				<h3 id="lead-support-cases-title" className="text-sm font-semibold">
					Casos de soporte
				</h3>
			</div>
			<form onSubmit={submit} className="space-y-2 rounded-md border border-border p-3">
				<label htmlFor={`lead-case-${leadId}`} className="text-sm font-medium">
					Asunto del caso
				</label>
				<Input
					id={`lead-case-${leadId}`}
					value={subject}
					onChange={(event) => setSubject(event.target.value)}
					maxLength={240}
					placeholder="Describe la solicitud"
					disabled={saving}
				/>
				<label htmlFor={`lead-case-priority-${leadId}`} className="text-sm font-medium">
					Prioridad
				</label>
				<select
					id={`lead-case-priority-${leadId}`}
					value={priority}
					onChange={(event) => setPriority(event.target.value as SupportCasePriority)}
					disabled={saving}
					className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
				>
					<option value="LOW">Baja</option>
					<option value="MEDIUM">Media</option>
					<option value="HIGH">Alta</option>
					<option value="URGENT">Urgente</option>
				</select>
				{formError && (
					<p role="alert" className="text-sm text-destructive">
						{formError}
					</p>
				)}
				<Button type="submit" size="sm" disabled={saving || !subject.trim()}>
					{saving ? 'Abriendo…' : 'Abrir caso'}
				</Button>
			</form>
			{status === 'loading' && (
				<p role="status" className="text-sm text-muted-foreground">
					Cargando casos…
				</p>
			)}
			{status === 'error' && (
				<p role="alert" className="text-sm text-destructive">
					No fue posible cargar los casos. Inténtalo de nuevo.
				</p>
			)}
			{status === 'idle' && cases.length === 0 && (
				<p className="text-sm text-muted-foreground">
					No hay casos de soporte para este lead.
				</p>
			)}
			{cases.map((supportCase) => (
				<div key={supportCase.idLeadSupportCase} className="space-y-1 text-sm">
					<p className="font-medium">{supportCase.subject}</p>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">{statusLabel[supportCase.status]}</Badge>
						<Badge variant="secondary">{priorityLabel[supportCase.priority]}</Badge>
						{onView && (
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => onView({ kind: 'case', id: supportCase.idLeadSupportCase })}
							>
								Ver
							</Button>
						)}
						{isOpen(supportCase.status) && draftId !== supportCase.idLeadSupportCase && (
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => setDraftId(supportCase.idLeadSupportCase)}
							>
								Cerrar caso
							</Button>
						)}
					</div>
					{draftId === supportCase.idLeadSupportCase && (
						<ResolutionNoteForm
							id={`case-${supportCase.idLeadSupportCase}`}
							submitLabel="Cerrar caso"
							pendingLabel="Cerrando…"
							saving={closingId === supportCase.idLeadSupportCase}
							includeCloseDate
							onCancel={() => setDraftId(null)}
							onSubmit={(comment, files, closeOn) =>
								void closeCase(supportCase.idLeadSupportCase, comment, files, closeOn)
							}
						/>
					)}
					{supportCase.resolvedAt && (
						<p className="text-xs text-muted-foreground">
							Cierre: {formatDateBogota(supportCase.resolvedAt)}
						</p>
					)}
					{supportCase.dueAt && (
						<p className="text-xs text-muted-foreground">
							SLA: {formatDateBogota(supportCase.dueAt)}
						</p>
					)}
					<Separator className="mt-3" />
				</div>
			))}
		</section>
	)
}
