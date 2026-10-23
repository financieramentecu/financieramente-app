import { createHash } from 'node:crypto'
import {
	createSlidingWindowLimiter,
	type SlidingWindowResult,
} from './auth-rate-limiter'

/**
 * Brute-force guard for the credentials `authorize` path.
 *
 * Keys come ONLY from request input (trusted client IP, SHA-256 of the
 * normalized email), never from whether the account exists, so a throttled
 * answer cannot be used to enumerate accounts. A successful login does NOT
 * reset the counters: the budget is a plain sliding window, which keeps the
 * limiter simple and stops an attacker who owns one valid account from
 * resetting the counter between guesses against the same email.
 */
export const CREDENTIALS_WINDOW_MS = 15 * 60 * 1000
export const CREDENTIALS_EMAIL_LIMIT = 10
export const CREDENTIALS_IP_LIMIT = 30

const ipLimiter = createSlidingWindowLimiter({
	name: 'credentials-login:ip',
	limit: CREDENTIALS_IP_LIMIT,
	windowMs: CREDENTIALS_WINDOW_MS,
})
const emailLimiter = createSlidingWindowLimiter({
	name: 'credentials-login:email',
	limit: CREDENTIALS_EMAIL_LIMIT,
	windowMs: CREDENTIALS_WINDOW_MS,
})

function hashEmail(email: string): string {
	return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

/**
 * Counts one credentials attempt. The IP budget is checked first; an attempt
 * the IP limiter blocks is not charged to the email, so a flooding IP cannot
 * lock a victim's email out for everyone else.
 */
export function checkCredentialsAttempt(input: {
	email: string
	clientIp: string
}): SlidingWindowResult {
	const ip = ipLimiter.check(input.clientIp)
	if (!ip.allowed) return ip
	return emailLimiter.check(hashEmail(input.email))
}

/** Test helper: clears every window. */
export function resetCredentialsRateLimiters(): void {
	ipLimiter.reset()
	emailLimiter.reset()
}
