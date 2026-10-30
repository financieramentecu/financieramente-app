import { createHash } from 'node:crypto'
import {
	createSlidingWindowLimiter,
	type SlidingWindowResult,
} from './auth-rate-limiter'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000

/**
 * Module-level limiters for the public account endpoints. Keys come ONLY from
 * request input (client IP, SHA-256 of the submitted email), never from
 * whether the account exists (SEC-04: a 429 must not leak existence). IP keys
 * MUST come from `getTrustedClientIp` (never the first `x-forwarded-for` hop).
 */
const forgotPasswordIpLimiter = createSlidingWindowLimiter({
	name: 'forgot-password:ip',
	limit: 10,
	windowMs: ONE_HOUR_MS,
})
const forgotPasswordEmailLimiter = createSlidingWindowLimiter({
	name: 'forgot-password:email',
	limit: 3,
	windowMs: ONE_HOUR_MS,
})
const accountTokenIpLimiter = createSlidingWindowLimiter({
	name: 'account-token:ip',
	limit: 20,
	windowMs: FIFTEEN_MINUTES_MS,
})

export function hashEmailForRateLimit(email: string): string {
	return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

export function checkForgotPasswordIp(trustedIp: string): SlidingWindowResult {
	return forgotPasswordIpLimiter.check(trustedIp)
}

export function checkForgotPasswordEmail(email: string): SlidingWindowResult {
	return forgotPasswordEmailLimiter.check(hashEmailForRateLimit(email))
}

/** `scope` separates the activate and reset-password budgets. */
export function checkAccountTokenIp(
	scope: 'activate' | 'reset-password',
	trustedIp: string
): SlidingWindowResult {
	return accountTokenIpLimiter.check(`${scope}:${trustedIp}`)
}

/** Test helper: clears every window. */
export function resetAccountRateLimiters(): void {
	forgotPasswordIpLimiter.reset()
	forgotPasswordEmailLimiter.reset()
	accountTokenIpLimiter.reset()
}
