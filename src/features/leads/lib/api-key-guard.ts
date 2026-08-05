import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Timing-safe API key validation for the CRM sync webhook.
 *
 * Never compares the raw secret with `===` — that leaks timing information
 * proportional to the number of matching leading bytes. Both the configured
 * secret and the provided key are first reduced to a fixed-length SHA-256
 * digest, then compared with `crypto.timingSafeEqual`, which itself requires
 * equal-length buffers (guaranteed here since both are the same digest size).
 */
export function isValidApiKey(providedKey: string | null | undefined): boolean {
	const configuredKey = process.env.LEADS_CRM_SYNC_API_KEY

	if (!configuredKey || !providedKey) {
		return false
	}

	const configuredDigest = createHash('sha256').update(configuredKey).digest()
	const providedDigest = createHash('sha256').update(providedKey).digest()

	return timingSafeEqual(configuredDigest, providedDigest)
}
