const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 120

/**
 * In-process sliding-window rate limiter, keyed by an arbitrary string
 * (the CRM sync API key hash). Not distributed — acceptable for the
 * current single-instance deployment; a Postgres-table limiter is the
 * documented upgrade path once multi-instance deploys are needed.
 */
const requestTimestampsByKey = new Map<string, number[]>()

export interface RateLimitResult {
	allowed: boolean
	retryAfterSeconds?: number
}

export function checkRateLimit(key: string): RateLimitResult {
	const now = Date.now()
	const windowStart = now - WINDOW_MS

	const existingTimestamps = requestTimestampsByKey.get(key) ?? []
	const timestampsInWindow = existingTimestamps.filter((t) => t > windowStart)

	if (timestampsInWindow.length >= MAX_REQUESTS_PER_WINDOW) {
		requestTimestampsByKey.set(key, timestampsInWindow)
		const oldestInWindow = timestampsInWindow[0]
		const retryAfterSeconds = Math.ceil(
			(oldestInWindow + WINDOW_MS - now) / 1000
		)
		return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) }
	}

	timestampsInWindow.push(now)
	requestTimestampsByKey.set(key, timestampsInWindow)

	return { allowed: true }
}
