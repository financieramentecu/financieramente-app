/**
 * Catalog rules apply to new identities and to edits that change the stored
 * document. An existing formatted number (for example "1.234.567") can stay
 * while the user updates other business fields.
 */
export function shouldRevalidateIdentity(params: {
	isEditMode: boolean
	originalType?: string | null
	nextType?: string | null
	originalNumber?: string | null
	nextNumber?: string | null
}): boolean {
	if (!params.isEditMode) {
		return true
	}

	const originalType = (params.originalType || 'CC').trim().toUpperCase()
	const nextType = (params.nextType || 'CC').trim().toUpperCase()
	const originalNumber = (params.originalNumber ?? '').trim()
	const nextNumber = (params.nextNumber ?? '').trim()

	return originalType !== nextType || originalNumber !== nextNumber
}
