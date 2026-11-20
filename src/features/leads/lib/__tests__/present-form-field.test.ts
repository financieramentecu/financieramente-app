import { describe, expect, it } from 'vitest'
import { FORM_FIELD_KIND, presentFormField } from '@/features/leads/lib/present-form-field'
import { formatLeadAmount } from '@/features/leads/table/format-lead-amount'
import type { LeadFormField } from '@/features/leads/types/form-submission.types'

function field(partial: LeadFormField): LeadFormField {
	return partial
}

describe('presentFormField', () => {
	it('formats a money amount and keeps a plain number', () => {
		expect(presentFormField(field({ key: 'monto', label: 'Monto solicitado', type: 'number', value: 45000000 }))).toEqual({
			kind: FORM_FIELD_KIND.MONEY,
			text: formatLeadAmount('45000000'),
		})
		expect(presentFormField(field({ key: 'score', label: 'Puntaje', type: 'number', value: 720 }))).toEqual({
			kind: FORM_FIELD_KIND.NUMBER,
			text: '720',
		})
	})

	it('splits a multi select and hides an empty answer', () => {
		expect(presentFormField(field({ key: 'plazo', label: 'Plazo', type: 'select', value: ['6 meses', '12 meses'] }))).toEqual({
			kind: FORM_FIELD_KIND.SELECT,
			chips: ['6 meses', '12 meses'],
		})
		expect(presentFormField(field({ key: 'ciudad', label: 'Ciudad', type: 'text', value: null })).kind).toBe(FORM_FIELD_KIND.EMPTY)
	})
})