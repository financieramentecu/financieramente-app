/**
 * Normalizes the `[code]` route segment for product configuration URLs.
 *
 * Next.js App Router may pass dynamic segments still percent-encoded (see e.g.
 * vercel/next.js#48058). A stored code like `C+S-PROPIO-JUNIOR` can appear in
 * the URL as `C%2BS-PROPIO-JUNIOR`; without decoding, lookups against Prisma
 * fail because the DB stores the decoded string.
 */
export function normalizeProductConfigurationCodeParam(raw: string): string {
	const trimmed = raw.trim()
	if (!trimmed) {
		return trimmed
	}
	try {
		return decodeURIComponent(trimmed)
	} catch {
		return trimmed
	}
}
