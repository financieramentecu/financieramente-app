import { describe, expect, it } from 'vitest'
import { DOCUMENT_DATA_TYPES } from '@/features/document-types/lib/document-data-type'
import { validateIdentityAgainstDocumentType } from '@/features/document-types/lib/validate-identity'
import { documentTypeFormSchema } from '@/features/document-types/lib/document-type-schemas'
import { lengthRangeError } from '@/features/document-types/lib/length-range'
import { STANDARD_DOCUMENT_TYPES } from '@/features/document-types/lib/standard-document-types'

const cc = {
	name: 'Cédula de Ciudadanía',
	dataType: DOCUMENT_DATA_TYPES.NUMERIC,
	minLength: 6,
	maxLength: 10,
}

describe('validateIdentityAgainstDocumentType', () => {
	it('accepts a numeric value inside the configured range', () => {
		expect(validateIdentityAgainstDocumentType('1234567890', cc)).toBeNull()
	})

	it('rejects letters on a numeric document type', () => {
		expect(validateIdentityAgainstDocumentType('12345A', cc)).toMatch(/dígitos/)
	})

	it('rejects a value shorter than the minimum', () => {
		expect(validateIdentityAgainstDocumentType('12345', cc)).toMatch(/al menos 6/)
	})

	it('rejects a value longer than the maximum', () => {
		expect(validateIdentityAgainstDocumentType('12345678901', cc)).toMatch(
			/no puede exceder 10/
		)
	})
})

describe('documentTypeFormSchema', () => {
	it('requires name, code, data type and lengths', () => {
		const result = documentTypeFormSchema.safeParse({
			name: '',
			code: '',
			dataType: 'NUMERIC',
			minLength: 0,
			maxLength: 1,
			status: true,
		})
		expect(result.success).toBe(false)
	})

	it('rejects a maximum shorter than the minimum', () => {
		expect(lengthRangeError(8, 4)).toMatch(/mayor o igual/)
	})

	it('upper bound stays within the identity column', () => {
		const result = documentTypeFormSchema.safeParse({
			name: 'Pasaporte diplomático',
			code: 'PD',
			dataType: 'ALPHANUMERIC',
			minLength: 6,
			maxLength: 21,
			status: true,
		})
		expect(result.success).toBe(false)
	})
})

describe('STANDARD_DOCUMENT_TYPES', () => {
	it('preloads the five base types as active-ready rules', () => {
		expect(STANDARD_DOCUMENT_TYPES.map((item) => item.code)).toEqual([
			'CC',
			'CE',
			'PAS',
			'NIT',
			'PPT',
		])
		for (const item of STANDARD_DOCUMENT_TYPES) {
			expect(item.minLength).toBeGreaterThan(0)
			expect(item.maxLength).toBeGreaterThanOrEqual(item.minLength)
		}
	})
})
