import { formatDateBogota } from '@/features/shared/lib/format-date'
import { formatLeadAmount } from '@/features/leads/table/format-lead-amount'
import { EMPTY_FORM_ANSWER, formatFormFieldValue } from '@/features/leads/lib/format-form-field-value'
import { FORM_FIELD_TYPES, type LeadFormField } from '@/features/leads/types/form-submission.types'

const MONEY_HINT = /monto|valor|ingreso|salario|cuota|precio|capital/

export const FORM_FIELD_KIND = {
	EMPTY: 'empty',
	MONEY: 'money',
	NUMBER: 'number',
	DATE: 'date',
	SELECT: 'select',
	TEXT: 'text',
} as const

export type FormFieldKind = (typeof FORM_FIELD_KIND)[keyof typeof FORM_FIELD_KIND]

export type FormFieldPresentation =
	| { kind: typeof FORM_FIELD_KIND.EMPTY; text: string }
	| { kind: typeof FORM_FIELD_KIND.MONEY; text: string }
	| { kind: typeof FORM_FIELD_KIND.NUMBER; text: string }
	| { kind: typeof FORM_FIELD_KIND.DATE; text: string }
	| { kind: typeof FORM_FIELD_KIND.SELECT; chips: string[] }
	| { kind: typeof FORM_FIELD_KIND.TEXT; text: string }

function looksLikeMoney(field: LeadFormField): boolean {
	const hint = `${field.key} ${field.label}`.toLowerCase()
	return MONEY_HINT.test(hint)
}

function selectChips(value: string | string[]): string[] {
	const items = Array.isArray(value) ? value : [value]
	return items.map((item) => item.trim()).filter((item) => item !== '')
}

/** Turns one stored answer into the block the detail sheet renders. */
export function presentFormField(field: LeadFormField): FormFieldPresentation {
	if (field.value === null || (Array.isArray(field.value) && field.value.length === 0)) {
		return { kind: FORM_FIELD_KIND.EMPTY, text: EMPTY_FORM_ANSWER }
	}

	if (field.type === FORM_FIELD_TYPES.NUMBER && typeof field.value === 'number') {
		if (looksLikeMoney(field)) {
			return { kind: FORM_FIELD_KIND.MONEY, text: formatLeadAmount(String(field.value)) }
		}
		return {
			kind: FORM_FIELD_KIND.NUMBER,
			text: field.value.toLocaleString('es-CO'),
		}
	}

	if (field.type === FORM_FIELD_TYPES.DATE && typeof field.value === 'string') {
		return { kind: FORM_FIELD_KIND.DATE, text: formatDateBogota(field.value) }
	}

	if (field.type === FORM_FIELD_TYPES.SELECT && (typeof field.value === 'string' || Array.isArray(field.value))) {
		const chips = selectChips(field.value)
		if (chips.length === 0) return { kind: FORM_FIELD_KIND.EMPTY, text: EMPTY_FORM_ANSWER }
		return { kind: FORM_FIELD_KIND.SELECT, chips }
	}

	const text = formatFormFieldValue(field.value)
	if (text === EMPTY_FORM_ANSWER) return { kind: FORM_FIELD_KIND.EMPTY, text }
	return { kind: FORM_FIELD_KIND.TEXT, text }
}
