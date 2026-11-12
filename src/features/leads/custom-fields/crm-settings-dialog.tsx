'use client'

import * as React from 'react'
import { Settings2, Trash2 } from 'lucide-react'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/features/shared/ui/dialog'
import {
	LEAD_CUSTOM_FIELD_TYPES,
	LEAD_CUSTOM_FIELD_TYPE_LABELS,
	type LeadCustomFieldType,
} from '@/features/leads/custom-fields/custom-field.types'
import { useCrmSettings } from '@/features/leads/custom-fields/use-crm-settings'

const SELECT_CLASS = 'h-9 rounded-md border border-input bg-background px-2 text-sm'
const DEFAULT_TAG_COLOR = '#64748b'

/** Suggested snake_case key from a label ("Fecha de cierre" → "fecha_de_cierre"). */
export function suggestFieldKey(label: string): string {
	return label
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.replace(/^(\d)/, 'f_$1')
		.slice(0, 40)
}

function TagsPanel({ settings }: { settings: ReturnType<typeof useCrmSettings> }) {
	const [name, setName] = React.useState('')
	const [color, setColor] = React.useState(DEFAULT_TAG_COLOR)
	const tags = settings.state.status === 'success' ? settings.state.data.tags : []

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (name.trim() && (await settings.addTag(name.trim(), color))) setName('')
	}

	return (
		<section aria-labelledby="crm-settings-tags" className="space-y-2">
			<h3 id="crm-settings-tags" className="text-sm font-semibold">Etiquetas</h3>
			<ul className="flex flex-wrap gap-2">
				{tags.length === 0 && <li className="text-sm text-muted-foreground">Aún no hay etiquetas.</li>}
				{tags.map((tag) => (
					<li key={tag.idLeadTag} className="flex items-center gap-1">
						<Badge variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
							{tag.name}
						</Badge>
						<Button type="button" size="sm" variant="ghost" aria-label={`Eliminar etiqueta ${tag.name}`} onClick={() => void settings.removeTag(tag.idLeadTag)}>
							<Trash2 className="size-3.5" aria-hidden />
						</Button>
					</li>
				))}
			</ul>
			<form onSubmit={submit} className="flex items-center gap-2">
				<Input aria-label="Nueva etiqueta" placeholder="Nueva etiqueta" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
				<input aria-label="Color de la etiqueta" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-9 w-10 rounded border" />
				<Button type="submit" size="sm" disabled={!name.trim()}>
					Agregar
				</Button>
			</form>
		</section>
	)
}

function FieldsPanel({ settings }: { settings: ReturnType<typeof useCrmSettings> }) {
	const [label, setLabel] = React.useState('')
	const [type, setType] = React.useState<LeadCustomFieldType>('TEXT')
	const [options, setOptions] = React.useState('')
	const fields = settings.state.status === 'success' ? settings.state.data.fields : []

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!label.trim()) return
		const created = await settings.addField({
			key: suggestFieldKey(label),
			label: label.trim(),
			type,
			options: type === 'SELECT' ? options.split(',').map((option) => option.trim()).filter(Boolean) : undefined,
		})
		if (created) {
			setLabel('')
			setOptions('')
		}
	}

	return (
		<section aria-labelledby="crm-settings-fields" className="space-y-2">
			<h3 id="crm-settings-fields" className="text-sm font-semibold">Campos personalizados</h3>
			<ul className="space-y-1">
				{fields.length === 0 && <li className="text-sm text-muted-foreground">Aún no hay campos personalizados.</li>}
				{fields.map((field) => (
					<li key={field.idLeadCustomField} className="flex items-center justify-between gap-2 text-sm">
						<span>
							{field.label} <span className="text-muted-foreground">· {LEAD_CUSTOM_FIELD_TYPE_LABELS[field.type]}</span>
							{field.type === 'SELECT' && <span className="text-muted-foreground"> ({field.options.join(', ')})</span>}
						</span>
						<Button type="button" size="sm" variant="ghost" aria-label={`Eliminar campo ${field.label}`} onClick={() => void settings.removeField(field.idLeadCustomField)}>
							<Trash2 className="size-3.5" aria-hidden />
						</Button>
					</li>
				))}
			</ul>
			<form onSubmit={submit} className="flex flex-wrap items-center gap-2">
				<Input aria-label="Nombre del campo" placeholder="Nombre del campo" value={label} maxLength={80} onChange={(event) => setLabel(event.target.value)} className="w-48" />
				<select aria-label="Tipo de campo" className={SELECT_CLASS} value={type} onChange={(event) => setType(event.target.value as LeadCustomFieldType)}>
					{LEAD_CUSTOM_FIELD_TYPES.map((value) => (
						<option key={value} value={value}>
							{LEAD_CUSTOM_FIELD_TYPE_LABELS[value]}
						</option>
					))}
				</select>
				{type === 'SELECT' && (
					<Input aria-label="Opciones separadas por coma" placeholder="Opción 1, Opción 2" value={options} onChange={(event) => setOptions(event.target.value)} className="w-56" />
				)}
				<Button type="submit" size="sm" disabled={!label.trim()}>
					Agregar
				</Button>
			</form>
		</section>
	)
}

/** CRM managers: tag catalogue and custom field definitions (Twenty data model settings, simplified). */
export function CrmSettingsDialog() {
	const [open, setOpen] = React.useState(false)
	const settings = useCrmSettings(open)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" size="sm" variant="outline">
					<Settings2 className="size-4" aria-hidden />
					Configurar
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Configurar CRM</DialogTitle>
					<DialogDescription>Etiquetas y campos personalizados disponibles para todos los leads.</DialogDescription>
				</DialogHeader>
				{settings.state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Cargando…</p>}
				{settings.state.status === 'error' && <p role="alert" className="text-sm text-destructive">{settings.state.error}</p>}
				{settings.state.status === 'success' && (
					<div className="space-y-6">
						<TagsPanel settings={settings} />
						<FieldsPanel settings={settings} />
					</div>
				)}
				{settings.actionError && <p role="alert" className="text-sm text-destructive">{settings.actionError}</p>}
			</DialogContent>
		</Dialog>
	)
}
