export const SKANDIA_COMPANY_NAME = 'SKANDIA'
export const MFUND_PRODUCT_NAME = 'MFUND'
export const MFUND_REQUIRED_PERIODICITY = 'Aportes Ocasionales'

export const MFUND_PERIODICITY_ERROR =
	'La periodicidad de MFUND (SKANDIA) debe ser Aportes Ocasionales'

export function isSkandiaMfund(
	companyName: string | null | undefined,
	productName: string | null | undefined
): boolean {
	return (
		companyName === SKANDIA_COMPANY_NAME && productName === MFUND_PRODUCT_NAME
	)
}

/**
 * SKANDIA + MFUND may only be stored with "Aportes Ocasionales".
 * Other company/product pairs are unrestricted.
 * Returns the user-facing error, or null when the combination is allowed.
 */
export function mfundPeriodicityError(input: {
	companyName: string | null | undefined
	productName: string | null | undefined
	periodicityName: string | null | undefined
}): string | null {
	if (!isSkandiaMfund(input.companyName, input.productName)) return null
	if (input.periodicityName === MFUND_REQUIRED_PERIODICITY) return null
	return MFUND_PERIODICITY_ERROR
}
