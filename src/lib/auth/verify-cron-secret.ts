import { timingSafeEqual } from 'crypto'

/**
 * Validates `Authorization: Bearer <CRON_SECRET>` in constant time.
 * Shared by every cron route (fund-payments, CRM reminders, CRM digest).
 */
export function verifyCronSecret(authorizationHeader: string | null): boolean {
	const expected = process.env.CRON_SECRET
	if (!expected || !authorizationHeader) return false

	const prefix = 'Bearer '
	if (!authorizationHeader.startsWith(prefix)) return false

	const incoming = authorizationHeader.slice(prefix.length)
	// timingSafeEqual throws on length mismatch, so guard first.
	if (incoming.length !== expected.length) return false

	return timingSafeEqual(Buffer.from(incoming), Buffer.from(expected))
}
