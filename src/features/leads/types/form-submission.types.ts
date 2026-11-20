export const FORM_FIELD_TYPES = {
	TEXT: 'text',
	NUMBER: 'number',
	DATE: 'date',
	SELECT: 'select',
} as const

export type FormFieldType = (typeof FORM_FIELD_TYPES)[keyof typeof FORM_FIELD_TYPES]

export type FormFieldValue = string | number | string[] | null

export interface LeadFormField {
	key: string
	label: string
	type: FormFieldType
	value: FormFieldValue
}

export interface LeadFormSnapshot {
	submissionId: string
	landingKey: string
	landingName: string
	landingVersion: string
	submittedAt: string
	fields: LeadFormField[]
}
