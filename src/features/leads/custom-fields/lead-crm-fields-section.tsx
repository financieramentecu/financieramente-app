'use client'

import * as React from 'react'
import { BadgeDollarSign } from 'lucide-react'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { MultiSelect } from '@/features/shared/ui/multi-select'
import { formatDateBogota } from '@/features/shared/lib/format-date'
import type { LeadTagChip } from '@/features/leads/table/lead-table.types'
import { formatLeadAmount } from '@/features/leads/table/format-lead-amount'
import type { CustomFieldDefinition, CustomFieldValues } from '@/features/leads/custom-fields/custom-field.types'
import {
	buildCrmFieldsPatch,
	toCrmFieldsFormValues,
	type CrmFieldsFormValues,
} from '@/features/leads/custom-fields/build-crm-fields-patch'
import { useLeadCrmFields } from '@/features/leads/custom-fields/use-lead-crm-fields'
import { Skeleton } from '@/features/shared/ui/skeleton'

const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'

function TagChips({ tags }: { tags: LeadTagChip[] }) {
	if (tags.length === 0) return <span className="text-sm text-muted-foreground">Sin etiquetas</span>
	return (
		<div className="flex flex-wrap gap-1">
			{tags.map((tag) => (
				<Badge key={tag.idLeadTag} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
					{tag.name}
				</Badge>
			))}
		</div>
	)
}

function formatCustomValue(definition: CustomFieldDefinition, values: CustomFieldValues): string {
	const value = values[definition.key]
	if (value === undefined || value === '') return '—'
	if (definition.type === 'DATE') return formatDateBogota(String(value))
	if (definition.type === 'NUMBER') return Number(value).toLocaleString('es-CO')
	return String(value)
}

function CustomFieldInput({
	definition,
	value,
	onChange,
}: {
	definition: CustomFieldDefinition
	value: string
	onChange: (value: string) => void
}) {
	const id = `crm-custom-${definition.key}`
	const label = (
		<label htmlFor={id} className="text-xs font-medium text-muted-foreground">
			{definition.label}
		</label>
	)
	if (definition.type === 'SELECT') {
		return (
			<div className="space-y-1">
				{label}
				<select id={id} className={SELECT_CLASS} value={value} onChange={(event) => onChange(event.target.value)}>
					<option value="">Sin seleccionar</option>
					{definition.options.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			</div>
		)
	}
	const type = definition.type === 'NUMBER' ? 'number' : definition.type === 'DATE' ? 'date' : 'text'
	return (
		<div className="space-y-1">
			{label}
			<Input id={id} type={type} value={value} maxLength={500} onChange={(event) => onChange(event.target.value)} />
		</div>
	)
}

/**
 * "Datos del CRM": CRM-owned data (Odoo expected revenue × probability,
 * Twenty tags and custom fields). Never synced from GHL, so it stays editable.
 */
export function LeadCrmFieldsSection({
	idLead,
	initialTags,
	canEdit,
}: {
	idLead: number
	initialTags: LeadTagChip[]
	canEdit: boolean
}) {
	const { state, tags, saving, message, save, updateTags } = useLeadCrmFields(idLead, initialTags)
	const [form, setForm] = React.useState<CrmFieldsFormValues | null>(null)

	if (state.status === 'loading' || state.status === 'idle') {
		return (
			<div role="status" aria-busy="true" className="space-y-3">
				<span className="sr-only">Cargando datos del CRM…</span>
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-9 w-2/3" />
			</div>
		)
	}
	if (state.status === 'error') {
		return <p role="alert" className="text-sm text-destructive">{state.error}</p>
	}

	const { fields, definitions, tagOptions } = state.data
	const values = form ?? toCrmFieldsFormValues(fields, definitions)
	const weighted =
		fields.estimatedValue && fields.probability !== null
			? String((Number(fields.estimatedValue) * fields.probability) / 100)
			: null

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		await save(buildCrmFieldsPatch(values, definitions))
		setForm(null)
	}

	return (
		<section aria-labelledby="crm-fields-title" className="space-y-3">
			<h3 id="crm-fields-title" className="flex items-center gap-2 text-sm font-semibold">
				<BadgeDollarSign className="size-4" aria-hidden />
				Datos del CRM
			</h3>

			<div className="space-y-1">
				<p className="text-xs font-medium text-muted-foreground">Etiquetas</p>
				{canEdit ? (
					<MultiSelect
						placeholder="Agregar etiquetas"
						options={tagOptions.map((tag) => ({ value: String(tag.idLeadTag), label: tag.name }))}
						value={tags.map((tag) => String(tag.idLeadTag))}
						onChange={(selected) => void updateTags(selected.map(Number))}
					/>
				) : (
					<TagChips tags={tags} />
				)}
			</div>

			{canEdit ? (
				<form onSubmit={submit} className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1">
							<label htmlFor="crm-estimated-value" className="text-xs font-medium text-muted-foreground">
								Valor estimado (COP)
							</label>
							<Input
								id="crm-estimated-value"
								inputMode="decimal"
								placeholder="Ej. 1500000"
								value={values.estimatedValue}
								onChange={(event) => setForm({ ...values, estimatedValue: event.target.value })}
							/>
						</div>
						<div className="space-y-1">
							<label htmlFor="crm-probability" className="text-xs font-medium text-muted-foreground">
								Probabilidad (%)
							</label>
							<Input
								id="crm-probability"
								type="number"
								min={0}
								max={100}
								step={1}
								value={values.probability}
								onChange={(event) => setForm({ ...values, probability: event.target.value })}
							/>
						</div>
					</div>
					{definitions.map((definition) => (
						<CustomFieldInput
							key={definition.key}
							definition={definition}
							value={values.custom[definition.key] ?? ''}
							onChange={(value) => setForm({ ...values, custom: { ...values.custom, [definition.key]: value } })}
						/>
					))}
					<p className="text-xs text-muted-foreground">Valor ponderado: {formatLeadAmount(weighted)}</p>
					<Button type="submit" size="sm" disabled={saving}>
						{saving ? 'Guardando…' : 'Guardar datos del CRM'}
					</Button>
				</form>
			) : (
				<dl className="grid grid-cols-2 gap-2 text-sm">
					<dt className="text-muted-foreground">Valor estimado</dt>
					<dd>{formatLeadAmount(fields.estimatedValue)}</dd>
					<dt className="text-muted-foreground">Probabilidad</dt>
					<dd>{fields.probability === null ? '—' : `${fields.probability}%`}</dd>
					<dt className="text-muted-foreground">Valor ponderado</dt>
					<dd>{formatLeadAmount(weighted)}</dd>
					{definitions.map((definition) => (
						<React.Fragment key={definition.key}>
							<dt className="text-muted-foreground">{definition.label}</dt>
							<dd>{formatCustomValue(definition, fields.customFieldValues)}</dd>
						</React.Fragment>
					))}
				</dl>
			)}

			{message && (
				<p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
					{message.text}
				</p>
			)}
		</section>
	)
}
