import { describe, expect, it } from 'vitest'
import { EMPTY_FORM_VALUE, formatFormFieldValue } from '@/features/leads/lib/format-form-field-value'
import { FORM_FIELD_TYPE } from '@/features/leads/types/form-submission.schema'

describe('formatFormFieldValue', () => {
	it('keeps zero and No, and labels an empty answer', () => {
		expect(
			formatFormFieldValue({ key: 'monto', label: 'Monto', type: FORM_FIELD_TYPE.NUMBER, value: 0 })
		).toBe('0')
		expect(
			formatFormFieldValue({ key: 'codeudor', label: 'Codeudor', type: FORM_FIELD_TYPE.SELECT, value: 'No' })
		).toBe('No')
		expect(
			formatFormFieldValue({ key: 'ciudad', label: 'Ciudad', type: FORM_FIELD_TYPE.TEXT, value: null })
		).toBe(EMPTY_FORM_VALUE)
	})

	it('joins a multiple selection and formats a calendar date', () => {
		expect(
			formatFormFieldValue({
				key: 'plazo',
				label: 'Plazo',
				type: FORM_FIELD_TYPE.SELECT,
				value: ['6 meses', '12 meses'],
			})
		).toBe('6 meses, 12 meses')
		expect(
			formatFormFieldValue({
				key: 'nacimiento',
				label: 'Nacimiento',
				type: FORM_FIELD_TYPE.DATE,
				value: '1990-02-28',
			})
		).toContain('1990')
	})
})
