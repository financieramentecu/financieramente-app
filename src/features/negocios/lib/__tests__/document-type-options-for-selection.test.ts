import { describe, expect, it } from 'vitest'
import { documentTypeOptionsForSelection } from '@/features/negocios/lib/document-type-options-for-selection'
import type { DocumentTypeOption } from '@/features/document-types/types/document-type.types'

const options: DocumentTypeOption[] = [
	{
		code: 'CC',
		name: 'Cédula de Ciudadanía',
		dataType: 'NUMERIC',
		minLength: 6,
		maxLength: 10,
		status: true,
	},
	{
		code: 'PAS',
		name: 'Pasaporte',
		dataType: 'ALPHANUMERIC',
		minLength: 6,
		maxLength: 15,
		status: false,
	},
]

describe('documentTypeOptionsForSelection', () => {
	it('offers only active types for a new selection', () => {
		expect(documentTypeOptionsForSelection(options, '').map((option) => option.code)).toEqual([
			'CC',
		])
	})

	it('keeps the inactive type that the record already uses', () => {
		expect(
			documentTypeOptionsForSelection(options, 'PAS').map((option) => option.code)
		).toEqual(['CC', 'PAS'])
	})

	it('matches the stored code regardless of case and surrounding spaces', () => {
		expect(
			documentTypeOptionsForSelection(options, ' pas ').map((option) => option.code)
		).toEqual(['CC', 'PAS'])
	})

	it('lists a stored code that is missing from the catalog as an inactive option', () => {
		const result = documentTypeOptionsForSelection(options, 'XX')

		expect(result.map((option) => option.code)).toEqual(['CC', 'XX'])
		expect(result[1]).toEqual({
			code: 'XX',
			name: 'XX',
			dataType: 'ALPHANUMERIC',
			minLength: 1,
			maxLength: 20,
			status: false,
		})
	})

	it('does not add a placeholder when nothing is selected', () => {
		expect(
			documentTypeOptionsForSelection(options, null).map((option) => option.code)
		).toEqual(['CC'])
	})
})
