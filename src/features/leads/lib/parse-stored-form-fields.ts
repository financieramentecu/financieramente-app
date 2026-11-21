import { formFieldsSchema, type FormField } from '@/features/leads/types/form-submission.schema'

/** Reads a stored snapshot. A corrupt row yields no fields instead of failing the detail. */
export function parseStoredFormFields(value: unknown): FormField[] {
	const parsed = formFieldsSchema.safeParse(value)
	return parsed.success ? parsed.data : []
}
