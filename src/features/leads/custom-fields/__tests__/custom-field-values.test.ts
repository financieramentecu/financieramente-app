import { describe, expect, it } from 'vitest'
import {
	mergeCustomFieldValues,
	pickVisibleCustomFieldValues,
	validateCustomFieldPatch,
} from '@/features/leads/custom-fields/custom-field-values'
import type { CustomFieldDefinition } from '@/features/leads/custom-fields/custom-field.types'

const defs: CustomFieldDefinition[] = [
	{ idLeadCustomField: 1, key: 'company', label: 'Empresa', type: 'TEXT', options: [], position: 0 },
	{ idLeadCustomField: 2, key: 'income', label: 'Ingresos', type: 'NUMBER', options: [], position: 1 },
	{ idLeadCustomField: 3, key: 'birthday', label: 'Cumpleaños', type: 'DATE', options: [], position: 2 },
	{ idLeadCustomField: 4, key: 'product', label: 'Producto', type: 'SELECT', options: ['Crédito', 'Seguro'], position: 3 },
]

describe('validateCustomFieldPatch', () => {
	it('accepts valid values and normalizes text', () => {
		expect(
			validateCustomFieldPatch(defs, { company: '  ACME  ', income: 1500.5, birthday: '1990-02-28', product: 'Seguro' })
		).toEqual({ ok: true, values: { company: 'ACME', income: 1500.5, birthday: '1990-02-28', product: 'Seguro' } })
	})

	it('treats null and empty text as removal', () => {
		expect(validateCustomFieldPatch(defs, { company: '   ', income: null })).toEqual({
			ok: true,
			values: { company: null, income: null },
		})
	})

	it.each([
		[{ unknown: 'x' }, 'Campo desconocido: unknown'],
		[{ company: 'x'.repeat(501) }, 'Empresa: máximo 500 caracteres'],
		[{ company: 5 }, 'Empresa: debe ser texto'],
		[{ income: '12' }, 'Ingresos: debe ser un número'],
		[{ income: Number.POSITIVE_INFINITY }, 'Ingresos: debe ser un número'],
		[{ birthday: '1990-02-30' }, 'Cumpleaños: fecha inválida'],
		[{ birthday: '28/02/1990' }, 'Cumpleaños: fecha inválida'],
		[{ product: 'Otro' }, 'Producto: opción inválida'],
	])('rejects %j', (patch, error) => {
		expect(validateCustomFieldPatch(defs, patch)).toEqual({ ok: false, error })
	})
})

describe('mergeCustomFieldValues', () => {
	it('sets, replaces and removes keys without touching the others', () => {
		expect(mergeCustomFieldValues({ company: 'A', income: 1, legacy: 'x' }, { company: 'B', income: null, product: 'Seguro' })).toEqual({
			company: 'B',
			legacy: 'x',
			product: 'Seguro',
		})
	})

	it('treats a non-object stored value as empty', () => {
		expect(mergeCustomFieldValues(null, { company: 'A' })).toEqual({ company: 'A' })
		expect(mergeCustomFieldValues(['x'], { company: 'A' })).toEqual({ company: 'A' })
	})
})

describe('pickVisibleCustomFieldValues', () => {
	it('keeps only active definitions', () => {
		expect(pickVisibleCustomFieldValues({ company: 'A', legacy: 'x' }, defs)).toEqual({ company: 'A' })
		expect(pickVisibleCustomFieldValues('bad', defs)).toEqual({})
	})
})
