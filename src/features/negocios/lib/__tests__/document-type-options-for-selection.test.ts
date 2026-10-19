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
})
