/**
 * Post-login redirect target sanitizer (open-redirect guard).
 *
 * Only same-origin RELATIVE paths are accepted: a single leading `/`, never
 * `//` or `/\` (browsers read both as protocol-relative), no scheme, no
 * backslashes and no control characters. The check runs on the raw value and
 * on its percent-decoded form, so `%2F%2Fevil.tld` and `/%5Cevil.tld` are
 * rejected too. Anything else falls back to the dashboard.
 *
 * Edge-safe and pure: no imports.
 */
export const DEFAULT_CALLBACK_URL = '/dashboard'

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

function isSafeRelativePath(value: string): boolean {
	if (!value.startsWith('/')) return false
	if (value.startsWith('//')) return false
	if (value.includes('\\')) return false
	return !CONTROL_CHARS.test(value)
}

export function sanitizeCallbackUrl(value: string | null | undefined): string {
	if (!value || !isSafeRelativePath(value)) return DEFAULT_CALLBACK_URL

	let decoded: string
	try {
		decoded = decodeURIComponent(value)
	} catch {
		return DEFAULT_CALLBACK_URL
	}
	return isSafeRelativePath(decoded) ? value : DEFAULT_CALLBACK_URL
}
