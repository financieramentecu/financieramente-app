import { createHash, randomBytes } from 'node:crypto'
import type { AccountTokenType } from '@prisma/client'

/** Raw token size in bytes (256 bits of entropy). */
const TOKEN_BYTES = 32

/** Token lifetimes: activation links last 72h, password reset links 1h. */
export const ACCOUNT_TOKEN_TTL_MS: Record<AccountTokenType, number> = {
	ACTIVATION: 72 * 60 * 60 * 1000,
	RESET: 60 * 60 * 1000,
}

/**
 * Generates the raw token that travels ONLY in the email link.
 * It must never be persisted or logged; store `hashToken(raw)` instead.
 */
export function generateRawToken(): string {
	return randomBytes(TOKEN_BYTES).toString('base64url')
}

/** SHA-256 hex digest (64 chars) of a raw token; the only persisted form. */
export function hashToken(rawToken: string): string {
	return createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Technical expiry instant (not a Bogota business date): `now` plus the TTL.
 */
export function computeTokenExpiry(type: AccountTokenType, now: Date): Date {
	return new Date(now.getTime() + ACCOUNT_TOKEN_TTL_MS[type])
}
