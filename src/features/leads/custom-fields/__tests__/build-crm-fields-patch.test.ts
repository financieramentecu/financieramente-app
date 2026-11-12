import { describe, expect, it } from 'vitest'
import { buildCrmFieldsPatch, toCrmFieldsFormValues } from '@/features/leads/custom-fields/build-crm-fields-patch'
import type { CustomFieldDefinition } from '@/features/leads/custom-fields/custom-field.types'

const defs: CustomFieldDefinition[] = [
	{ idLeadCustomField: 1, key: 'company', label: 'Empresa', type: 'TEXT', options: [], position: 0 },
	{ idLeadCustomField: 2, key: 'income', label: 'Ingresos', type: 'NUMBER', options: [], position: 1 },
]

describe('CRM fields form', () => {
	it('fills the form from stored values', () => {
		expect(toCrmFieldsFormValues({ estimatedValue: '1500000', probability: 40, customFieldValues: { income: 10 } }, defs)).toEqual({
			estimatedValue: '1500000',
			probability: '40',
			custom: { company: '', income: '10' },
		})
	})

	it('builds the patch: empty clears, numbers are parsed', () => {
		expect(
			buildCrmFieldsPatch({ estimatedValue: ' 2000000 ', probability: '', custom: { company: ' ACME ', income: '' } }, defs)
		).toEqual({ estimatedValue: '2000000', probability: null, customFields: { company: 'ACME', income: null } })
		expect(buildCrmFieldsPatch({ estimatedValue: '', probability: '75', custom: { income: '1.5' } }, defs).customFields).toEqual({
			company: null,
			income: 1.5,
		})
	})

	it('omits custom fields when there are no definitions', () => {
		expect(buildCrmFieldsPatch({ estimatedValue: '', probability: '10', custom: {} }, [])).toEqual({
			estimatedValue: null,
			probability: 10,
		})
	})
})
