import { IDENTITY_STORAGE_MAX_LENGTH } from '@/features/document-types/lib/document-data-type'

export function lengthRangeError(
	minLength: number,
	maxLength: number
): string | null {
	if (!Number.isInteger(minLength) || minLength <= 0) {
		return 'La longitud mínima debe ser un número entero mayor a 0'
	}

	if (!Number.isInteger(maxLength) || maxLength <= 0) {
		return 'La longitud máxima debe ser un número entero mayor a 0'
	}

	if (maxLength < minLength) {
		return 'La longitud máxima debe ser mayor o igual a la longitud mínima'
	}

	if (
		minLength > IDENTITY_STORAGE_MAX_LENGTH ||
		maxLength > IDENTITY_STORAGE_MAX_LENGTH
	) {
		return `La longitud no puede exceder ${IDENTITY_STORAGE_MAX_LENGTH} caracteres`
	}

	return null
}
