import {
	DOCUMENT_DATA_TYPES,
	type DocumentDataTypeCode,
} from '@/features/document-types/lib/document-data-type'

export interface IdentityRule {
	name: string
	dataType: DocumentDataTypeCode
	minLength: number
	maxLength: number
}

const NUMERIC_PATTERN = /^\d+$/
const ALPHANUMERIC_PATTERN = /^[A-Za-z0-9]+$/

/**
 * Returns a Spanish validation message, or null when the value matches the rule.
 */
export function validateIdentityAgainstDocumentType(
	identityNumber: string,
	rule: IdentityRule
): string | null {
	const value = identityNumber.trim()

	if (rule.dataType === DOCUMENT_DATA_TYPES.NUMERIC && !NUMERIC_PATTERN.test(value)) {
		return `El número de ${rule.name} solo puede contener dígitos`
	}

	if (
		rule.dataType === DOCUMENT_DATA_TYPES.ALPHANUMERIC &&
		!ALPHANUMERIC_PATTERN.test(value)
	) {
		return `El número de ${rule.name} solo puede contener letras y números`
	}

	if (value.length < rule.minLength) {
		return `El número de ${rule.name} debe tener al menos ${rule.minLength} caracteres`
	}

	if (value.length > rule.maxLength) {
		return `El número de ${rule.name} no puede exceder ${rule.maxLength} caracteres`
	}

	return null
}
