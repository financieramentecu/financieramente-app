import { FORM_FIELD_TYPES, type FormFieldType, type FormFieldValue, type LeadFormField, type LeadFormSnapshot } from '@/features/leads/types/form-submission.types'

const FIELD_TYPES = new Set<string>(Object.values(FORM_FIELD_TYPES))

function isFieldType(value: unknown): value is FormFieldType {
	return typeof value === 'string' && FIELD_TYPES.has(value)
}

function storedValue(value: unknown): FormFieldValue {
	if (value === null || typeof value === 'number' || typeof value === 'string') return value
	if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value
	return null
}

/** Reads a snapshot `fields` JSON column back into the display contract. */
export function mapStoredFormFields(value: unknown): LeadFormField[] {
	if (!Array.isArray(value)) return []
	return value.flatMap((item) => {
		if (typeof item !== 'object' || item === null) return []
		const record = item as Record<string, unknown>
		if (typeof record.key !== 'string' || typeof record.label !== 'string' || !isFieldType(record.type)) {
			return []
		}
		return [{ key: record.key, label: record.label, type: record.type, value: storedValue(record.value) }]
	})
}

export function mapFormSnapshot(record: {
	submissionId: string
	landingKey: string
	landingName: string
	landingVersion: string
	submittedAt: Date
	fields: unknown
}): LeadFormSnapshot {
	return {
		submissionId: record.submissionId,
		landingKey: record.landingKey,
		landingName: record.landingName,
		landingVersion: record.landingVersion,
		submittedAt: record.submittedAt.toISOString(),
		fields: mapStoredFormFields(record.fields),
	}
}
