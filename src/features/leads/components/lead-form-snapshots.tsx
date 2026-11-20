import { Calendar, CircleDollarSign, Hash, ListChecks, Type } from 'lucide-react'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { cn } from '@/lib/utils'
import {
	FORM_FIELD_KIND,
	presentFormField,
	type FormFieldKind,
} from '@/features/leads/lib/present-form-field'
import type { LeadFormField, LeadFormSnapshot } from '@/features/leads/types/form-submission.types'

const FIELD_TONE: Record<FormFieldKind, string> = {
	[FORM_FIELD_KIND.MONEY]: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
	[FORM_FIELD_KIND.NUMBER]: 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40',
	[FORM_FIELD_KIND.DATE]: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
	[FORM_FIELD_KIND.SELECT]: 'border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40',
	[FORM_FIELD_KIND.TEXT]: 'border-border bg-background',
	[FORM_FIELD_KIND.EMPTY]: 'border-dashed border-border bg-muted/30',
}

function FieldIcon({ kind }: { kind: FormFieldKind }) {
	const className = 'size-3.5 shrink-0 text-muted-foreground'
	if (kind === FORM_FIELD_KIND.MONEY) return <CircleDollarSign className={className} aria-hidden />
	if (kind === FORM_FIELD_KIND.NUMBER) return <Hash className={className} aria-hidden />
	if (kind === FORM_FIELD_KIND.DATE) return <Calendar className={className} aria-hidden />
	if (kind === FORM_FIELD_KIND.SELECT) return <ListChecks className={className} aria-hidden />
	return <Type className={className} aria-hidden />
}

function FormFieldAnswer({ field }: { field: LeadFormField }) {
	const presentation = presentFormField(field)
	const wide = presentation.kind === FORM_FIELD_KIND.TEXT && presentation.text.length > 80

	return (
		<div className={cn('rounded-md border px-3 py-2', FIELD_TONE[presentation.kind], wide && 'sm:col-span-2')}>
			<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				<FieldIcon kind={presentation.kind} />
				{field.label}
			</p>
			{presentation.kind === FORM_FIELD_KIND.SELECT ? (
				<ul className="mt-1.5 flex flex-wrap gap-1">
					{presentation.chips.map((chip) => (
						<li
							key={chip}
							className="rounded-full bg-violet-200 px-2 py-0.5 text-xs font-medium text-violet-950 dark:bg-violet-900 dark:text-violet-100"
						>
							{chip}
						</li>
					))}
				</ul>
			) : (
				<p
					className={cn(
						'mt-1 text-foreground',
						presentation.kind === FORM_FIELD_KIND.MONEY && 'text-base font-semibold tabular-nums',
						presentation.kind === FORM_FIELD_KIND.NUMBER && 'font-semibold tabular-nums',
						presentation.kind === FORM_FIELD_KIND.EMPTY && 'text-sm text-muted-foreground',
						presentation.kind === FORM_FIELD_KIND.TEXT && 'text-sm whitespace-pre-wrap',
						presentation.kind === FORM_FIELD_KIND.DATE && 'text-sm font-medium'
					)}
				>
					{presentation.text}
				</p>
			)}
		</div>
	)
}

/** Landing answers in the order n8n sent them. Each snapshot stays as it was stored. */
export function LeadFormSnapshots({ snapshots }: { snapshots: readonly LeadFormSnapshot[] }) {
	if (snapshots.length === 0) return null

	return (
		<section className="space-y-3" aria-label="Datos del formulario">
			<h3 className="text-sm font-semibold text-foreground">Datos del formulario</h3>
			{snapshots.map((snapshot) => (
				<article key={snapshot.submissionId} className="space-y-3 rounded-lg border border-border p-3">
					<header className="space-y-0.5">
						<p className="text-sm font-medium">
							{snapshot.landingName}
							<span className="font-normal text-muted-foreground"> · v{snapshot.landingVersion}</span>
						</p>
						<p className="text-xs text-muted-foreground">
							{snapshot.fields.length} respuestas · {formatDateTimeBogota(snapshot.submittedAt)}
						</p>
					</header>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{snapshot.fields.map((field) => (
							<FormFieldAnswer key={`${snapshot.submissionId}-${field.key}`} field={field} />
						))}
					</div>
				</article>
			))}
		</section>
	)
}
