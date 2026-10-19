export interface StoredIdentityComparison {
	identityNumber: string
	typeIdentity: string
	storedIdentityNumber?: string | null
	storedTypeIdentity?: string | null
}

function normalizeIdentityNumber(value: string | null | undefined): string {
	return (value ?? '').trim().toUpperCase()
}

function normalizeTypeIdentity(value: string | null | undefined): string {
	return (value ?? '').trim().toUpperCase()
}

/**
 * True when the submitted document type and number still match the value
 * already stored. Legacy formats stay valid until one of those fields changes.
 */
export function keepsStoredIdentity(input: StoredIdentityComparison): boolean {
	const storedNumber = normalizeIdentityNumber(input.storedIdentityNumber)
	const storedType = normalizeTypeIdentity(input.storedTypeIdentity)
	if (!storedNumber || !storedType) return false

	return (
		normalizeIdentityNumber(input.identityNumber) === storedNumber &&
		normalizeTypeIdentity(input.typeIdentity) === storedType
	)
}
