import { describe, it, expect } from 'vitest'
import {
	ACCOUNT_TOKEN_TTL_MS,
	computeTokenExpiry,
	generateRawToken,
	hashToken,
} from '../account-token'

describe('generateRawToken', () => {
	it('returns a base64url string encoding 32 random bytes', () => {
		const token = generateRawToken()
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
		expect(Buffer.from(token, 'base64url')).toHaveLength(32)
		expect(token).toHaveLength(43)
	})

	it('never repeats across calls', () => {
		const tokens = new Set(Array.from({ length: 200 }, generateRawToken))
		expect(tokens.size).toBe(200)
	})
})

describe('hashToken', () => {
	it('returns a 64 char lowercase SHA-256 hex digest', () => {
		expect(hashToken('abc')).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
		)
		expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/)
	})

	it('is deterministic and input sensitive', () => {
		expect(hashToken('a')).toBe(hashToken('a'))
		expect(hashToken('a')).not.toBe(hashToken('b'))
	})

	it('does not contain the raw token', () => {
		const raw = generateRawToken()
		expect(hashToken(raw)).not.toContain(raw)
	})
})

describe('token TTL', () => {
	const now = new Date('2026-01-01T00:00:00.000Z')

	it('uses 72h for activation and 1h for reset', () => {
		expect(ACCOUNT_TOKEN_TTL_MS.ACTIVATION).toBe(72 * 60 * 60 * 1000)
		expect(ACCOUNT_TOKEN_TTL_MS.RESET).toBe(60 * 60 * 1000)
	})

	it('computes expiry relative to the provided instant', () => {
		expect(computeTokenExpiry('ACTIVATION', now).toISOString()).toBe(
			'2026-01-04T00:00:00.000Z'
		)
		expect(computeTokenExpiry('RESET', now).toISOString()).toBe(
			'2026-01-01T01:00:00.000Z'
		)
	})
})
