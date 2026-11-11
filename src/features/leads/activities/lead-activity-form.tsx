'use client'

import { useRef, useState, type FormEvent } from 'react'
import { Paperclip } from 'lucide-react'
import { Textarea } from '@/features/shared/ui/textarea'
import { Button } from '@/features/shared/ui/button'
import {
	CONTACT_OUTCOMES,
	type ContactOutcome,
	type LeadCrmEventInput,
	type LoggedContactType,
} from '@/features/leads/crm/lead-crm-event.schema'
import { CONTACT_OUTCOME_LABELS } from '@/features/leads/activities/describe-timeline-entry'

type FormType = 'NOTE_ADDED' | LoggedContactType

const TYPE_OPTIONS: { value: FormType; label: string }[] = [
	{ value: 'NOTE_ADDED', label: 'Nota' },
	{ value: 'CALL_LOGGED', label: 'Llamada' },
	{ value: 'MEETING_LOGGED', label: 'Reunión' },
	{ value: 'EMAIL_LOGGED', label: 'Email' },
	{ value: 'WHATSAPP_LOGGED', label: 'WhatsApp' },
]

const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'

export function buildActivityInput(type: FormType, text: string, outcome: ContactOutcome | ''): LeadCrmEventInput {
	if (type === 'NOTE_ADDED') return { type, payload: { note: text } }
	return { type, payload: outcome ? { summary: text, outcome } : { summary: text } }
}

/** "Registrar actividad": note or logged contact (Odoo "Log activity"). */
export function LeadActivityForm({
	leadId,
	onSubmit,
}: {
	leadId: number
	onSubmit: (input: LeadCrmEventInput, files: readonly File[]) => Promise<boolean>
}) {
	const [type, setType] = useState<FormType>('NOTE_ADDED')
	const [text, setText] = useState('')
	const [outcome, setOutcome] = useState<ContactOutcome | ''>('')
	const [files, setFiles] = useState<File[]>([])
	const [saving, setSaving] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)
	const fileInput = useRef<HTMLInputElement>(null)

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const trimmed = text.trim()
		if (!trimmed && files.length === 0) return
		setSaving(true)
		setFormError(null)
		const saved = await onSubmit(buildActivityInput(type, trimmed || 'Adjunto', outcome), files)
		setSaving(false)
		if (saved) {
			setText('')
			setOutcome('')
			setFiles([])
		} else {
			setFormError('No fue posible registrar la actividad. Inténtalo de nuevo.')
		}
	}

	return (
		<form onSubmit={submit} className="space-y-2 rounded-md border border-border p-3">
			<p className="text-sm font-medium">Registrar actividad</p>
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-1">
					<label htmlFor={`activity-type-${leadId}`} className="text-xs text-muted-foreground">Tipo de actividad</label>
					<select id={`activity-type-${leadId}`} className={SELECT_CLASS} value={type} disabled={saving} onChange={(event) => setType(event.target.value as FormType)}>
						{TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
					</select>
				</div>
				{type !== 'NOTE_ADDED' && (
					<div className="space-y-1">
						<label htmlFor={`activity-outcome-${leadId}`} className="text-xs text-muted-foreground">Resultado</label>
						<select id={`activity-outcome-${leadId}`} className={SELECT_CLASS} value={outcome} disabled={saving} onChange={(event) => setOutcome(event.target.value as ContactOutcome | '')}>
							<option value="">Sin especificar</option>
							{CONTACT_OUTCOMES.map((value) => <option key={value} value={value}>{CONTACT_OUTCOME_LABELS[value]}</option>)}
						</select>
					</div>
				)}
			</div>
			<label htmlFor={`activity-detail-${leadId}`} className="sr-only">Detalle</label>
			<Textarea id={`activity-detail-${leadId}`} value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder={type === 'NOTE_ADDED' ? 'Registra un seguimiento' : '¿Qué pasó en el contacto?'} disabled={saving} />
			<div className="space-y-1">
				<label htmlFor={`activity-files-${leadId}`} className="sr-only">
					Adjuntar archivos
				</label>
				<input
					ref={fileInput}
					id={`activity-files-${leadId}`}
					type="file"
					multiple
					accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.docx,.xlsx"
					disabled={saving}
					className="sr-only"
					onChange={(event) => {
						const selected = Array.from(event.target.files ?? [])
						setFiles((current) => [...current, ...selected].slice(0, 3))
						event.target.value = ''
					}}
				/>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={saving}
					onClick={() => fileInput.current?.click()}
				>
					<Paperclip className="size-4" aria-hidden />
					Adjuntar archivo
				</Button>
				<p className="text-xs text-muted-foreground">Hasta 3 archivos, de 4 MB cada uno.</p>
				{files.length > 0 && (
					<ul className="space-y-1 text-sm">
						{files.map((file) => (
							<li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2">
								<span className="truncate">{file.name}</span>
								<button
									type="button"
									className="text-xs text-muted-foreground underline"
									onClick={() =>
										setFiles((current) => current.filter((item) => item !== file))
									}
								>
									Quitar
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
			{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
			<Button type="submit" size="sm" disabled={saving || (!text.trim() && files.length === 0)}>{saving ? 'Guardando…' : 'Registrar'}</Button>
		</form>
	)
}
