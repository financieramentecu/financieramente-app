/**
 * Client-safe constants (no imports) shared by the credentials `authorize`
 * path and the login page.
 *
 * `code` travels in the sign-in redirect URL. It is identical for every
 * throttled attempt (existing or unknown email), so it reveals nothing about
 * the account. Keep it free of any account detail.
 */
export const RATE_LIMITED_CODE = 'rate_limited'

/** Generic, non-enumerating message shown by the login page when throttled. */
export const RATE_LIMITED_MESSAGE =
	'Demasiados intentos. Intenta de nuevo más tarde.'
