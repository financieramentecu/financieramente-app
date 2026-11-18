import type { FormField } from '@/features/leads/types/form-submission.schema'

/** One stored landing snapshot, newest first in the prospect detail. */
export interface LeadFormSubmissionView {
	submissionId: string
	landingKey: string
	landingName: string
	formVersion: string
	submittedAt: string
	fields: FormField[]
}

export interface IngestLeadFormResult {
	idLead: number
	created: boolean
	replayed: boolean
}
