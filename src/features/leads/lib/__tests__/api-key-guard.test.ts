import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isValidApiKey } from '@/features/leads/lib/api-key-guard'

const IMPLEMENTATION_PATH = join(
	process.cwd(),
	'src/features/leads/lib/api-key-guard.ts'
)

const ENV_KEY = 'LEADS_CRM_SYNC_API_KEY'
const VALID_KEY = 'super-secret-crm-sync-key-0123456789'

describe('isValidApiKey', () => {
	beforeEach(() => {
		vi.stubEnv(ENV_KEY, VALID_KEY)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('accepts the exact configured key', () => {
		expect(isValidApiKey(VALID_KEY)).toBe(true)
	})

	it('rejects a same-length but different key', () => {
		const sameLengthWrongKey = 'x'.repeat(VALID_KEY.length)
		expect(isValidApiKey(sameLengthWrongKey)).toBe(false)
	})

	it('uses crypto.timingSafeEqual over digests, never raw `===` on the secret', () => {
		// Guards the implementation contract itself: a static-analysis assertion
		// so the timing-oracle regression is caught even though `node:crypto`
		// exports cannot be spied on in ESM (module namespace not configurable).
		const source = readFileSync(IMPLEMENTATION_PATH, 'utf-8')
		expect(source).toContain('timingSafeEqual')
		expect(source).not.toMatch(/providedKey\s*===\s*configuredKey/)
		expect(source).not.toMatch(/configuredKey\s*===\s*providedKey/)
	})

	it('rejects a missing header (null/undefined)', () => {
		expect(isValidApiKey(null)).toBe(false)
		expect(isValidApiKey(undefined)).toBe(false)
	})

	it('rejects an empty string header', () => {
		expect(isValidApiKey('')).toBe(false)
	})

	it('rejects a key of a different length without throwing', () => {
		expect(() => isValidApiKey('short')).not.toThrow()
		expect(isValidApiKey('short')).toBe(false)
	})

	it('rejects when the server has no configured key', () => {
		vi.stubEnv(ENV_KEY, '')
		expect(isValidApiKey(VALID_KEY)).toBe(false)
	})
})
