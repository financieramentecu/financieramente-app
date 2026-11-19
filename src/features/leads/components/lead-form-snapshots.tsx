import { formatDateBogota, formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { formatFormFieldValue } from '@/features/leads/lib/format-form-field-value'
import { FORM_FIELD_TYPES } from '@/features/leads/types/form-submission.types'
import type { LeadFormSnapshot } from '@/features/leads/types/form-submission.types'

function displayValue(field: LeadFormSnapshot['fields'][number]): string {
	if (field.type === FORM_FIELD_TYPES.DATE && typeof field.value === 'string') {
		return formatDateBogota(field.value)
	}
	return formatFormFieldValue(field.value)
}

/** Landing answers in the order n8n sent them. Each snapshot stays as it was stored. */
export function LeadFormSnapshots({ snapshots }: { snapshots: readonly LeadFormSnapshot[] }) {
	if (snapshots.length === 0) return null

	return (
		<section className="space-y-3" aria-label="Formulario de origen">
			<h3 className="text-sm font-medium text-foreground">Formulario de origen</h3>
			{snapshots.map((snapshot) => (
				<article key={snapshot.submissionId} className="space-y-2 rounded-md border border-border p-3">
					<header className="space-y-0.5">
						<p className="text-sm font-medium">
							{snapshot.landingName}
							<span className="font-normal text-muted-foreground"> · v{snapshot.landingVersion}</span>
						</p>
						<p className="text-xs text-muted-foreground">{formatDateTimeBogota(snapshot.submittedAt)}</p>
					</header>
					<dl className="space-y-1.5">
						{snapshot.fields.map((field) => (
							<div key={`${snapshot.submissionId}-${field.key}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 text-sm">
								<dt className="text-muted-foreground">{field.label}</dt>
								<dd>{displayValue(field)}</dd>
							</div>
						))}
					</dl>
				</article>
			))}
		</section>
	)
}
