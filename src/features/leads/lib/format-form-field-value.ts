import { FORM_FIELD_TYPE, type FormField } from '@/features/leads/types/form-submission.schema'
import { formatDateBogota } from '@/features/shared/lib/format-date'

export const EMPTY_FORM_VALUE = 'Sin información'

/** Label answer for the prospect detail. `0` and `"No"` stay visible. */
export function formatFormFieldValue(field: FormField): string {
	const { value } = field
	if (value === null) return EMPTY_FORM_VALUE
	if (field.type === FORM_FIELD_TYPE.NUMBER && typeof value === 'number') {
		return value.toLocaleString('es-CO')
	}
	if (field.type === FORM_FIELD_TYPE.DATE && typeof value === 'string') {
		return formatDateBogota(value)
	}
	if (Array.isArray(value)) {
		return value.length > 0 ? value.join(', ') : EMPTY_FORM_VALUE
	}
	if (typeof value === 'string') {
		return value.trim() === '' ? EMPTY_FORM_VALUE : value
	}
	return EMPTY_FORM_VALUE
}
