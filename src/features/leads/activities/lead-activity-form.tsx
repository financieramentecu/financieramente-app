'use client'

import * as React from 'react'
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
	onSubmit: (input: LeadCrmEventInput) => Promise<boolean>
}) {
	const [type, setType] = React.useState<FormType>('NOTE_ADDED')
	const [text, setText] = React.useState('')
	const [outcome, setOutcome] = React.useState<ContactOutcome | ''>('')
	const [saving, setSaving] = React.useState(false)
	const [formError, setFormError] = React.useState<string | null>(null)

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const trimmed = text.trim()
		if (!trimmed) return
		setSaving(true)
		setFormError(null)
		const saved = await onSubmit(buildActivityInput(type, trimmed, outcome))
		setSaving(false)
		if (saved) {
			setText('')
			setOutcome('')
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
			{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
			<Button type="submit" size="sm" disabled={saving || !text.trim()}>{saving ? 'Guardando…' : 'Registrar'}</Button>
		</form>
	)
}
