export const DOCUMENT_DATA_TYPES = {
	NUMERIC: 'NUMERIC',
	ALPHANUMERIC: 'ALPHANUMERIC',
} as const

export type DocumentDataTypeCode =
	(typeof DOCUMENT_DATA_TYPES)[keyof typeof DOCUMENT_DATA_TYPES]

export const DOCUMENT_DATA_TYPE_LABELS: Record<DocumentDataTypeCode, string> = {
	NUMERIC: 'Numérico',
	ALPHANUMERIC: 'Alfanumérico',
}

export const IDENTITY_STORAGE_MAX_LENGTH = 20

export function isDocumentDataTypeCode(
	value: string
): value is DocumentDataTypeCode {
	return (
		value === DOCUMENT_DATA_TYPES.NUMERIC ||
		value === DOCUMENT_DATA_TYPES.ALPHANUMERIC
	)
}
