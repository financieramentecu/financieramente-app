import { formatFormFieldValue } from '@/features/leads/lib/format-form-field-value'
import type { LeadFormSubmissionView } from '@/features/leads/types/form-submission.types'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'

/** Renders every stored landing snapshot, newest first, without a per-landing layout. */
export function LeadFormOriginSection({
	submissions,
}: {
	submissions: readonly LeadFormSubmissionView[]
}) {
	if (submissions.length === 0) return null

	return (
		<section aria-label="Formulario de origen" className="space-y-3">
			<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Formulario de origen
			</p>
			{submissions.map((submission) => (
				<div key={submission.submissionId} className="space-y-1">
					<p className="text-sm font-medium text-foreground">{submission.landingName}</p>
					<p className="text-xs text-muted-foreground">
						{formatDateTimeBogota(submission.submittedAt)} · versión {submission.formVersion}
					</p>
					<dl className="space-y-1">
						{submission.fields.map((field) => (
							<div key={`${submission.submissionId}-${field.key}`} className="text-sm">
								<dt className="text-muted-foreground">{field.label}</dt>
								<dd className="text-foreground">{formatFormFieldValue(field)}</dd>
							</div>
						))}
					</dl>
				</div>
			))}
		</section>
	)
}
