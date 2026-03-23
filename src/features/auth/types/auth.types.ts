/**
 * Constantes de dominio corporativo
 */
export const CORPORATE_DOMAIN = 'financieramentecu.com'

/**
 * Validación de dominio de email corporativo
 */
export function isValidCorporateEmail(email: string): boolean {
	if (!email || typeof email !== 'string') {
		return false
	}

	const emailDomain = email.split('@')[1]
	return emailDomain === CORPORATE_DOMAIN
}
