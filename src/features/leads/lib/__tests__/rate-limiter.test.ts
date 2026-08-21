import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkRateLimit } from '@/features/leads/lib/rate-limiter'

describe('checkRateLimit', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('allows up to 120 requests per key within the 60s window', () => {
		const key = 'key-a'
		for (let i = 0; i < 120; i++) {
			expect(checkRateLimit(key).allowed).toBe(true)
		}
	})

	it('throttles the 121st request within the same window', () => {
		const key = 'key-b'
		for (let i = 0; i < 120; i++) {
			checkRateLimit(key)
		}
		const result = checkRateLimit(key)
		expect(result.allowed).toBe(false)
	})

	it('slides the window: old requests expire and free up capacity', () => {
		const key = 'key-c'
		for (let i = 0; i < 120; i++) {
			checkRateLimit(key)
		}
		expect(checkRateLimit(key).allowed).toBe(false)

		// Advance past the 60s window
		vi.advanceTimersByTime(60_001)

		expect(checkRateLimit(key).allowed).toBe(true)
	})

	it('tracks independent keys separately', () => {
		const keyX = 'key-x'
		const keyY = 'key-y'
		for (let i = 0; i < 120; i++) {
			checkRateLimit(keyX)
		}
		expect(checkRateLimit(keyX).allowed).toBe(false)
		expect(checkRateLimit(keyY).allowed).toBe(true)
	})
})
