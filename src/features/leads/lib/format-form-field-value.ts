import type { FormFieldValue } from '@/features/leads/types/form-submission.types'

export const EMPTY_FORM_ANSWER = 'Sin información'

/** Renders a stored answer. `0` and `No` stay visible; null and an empty list do not. */
export function formatFormFieldValue(value: FormFieldValue): string {
	if (value === null) return EMPTY_FORM_ANSWER
	if (typeof value === 'number') return String(value)
	if (Array.isArray(value)) {
		const items = value.map((item) => item.trim()).filter((item) => item !== '')
		return items.length === 0 ? EMPTY_FORM_ANSWER : items.join(', ')
	}
	const trimmed = value.trim()
	return trimmed === '' ? EMPTY_FORM_ANSWER : trimmed
}
