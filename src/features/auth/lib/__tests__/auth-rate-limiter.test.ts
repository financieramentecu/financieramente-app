import { describe, it, expect } from 'vitest'
import { createSlidingWindowLimiter } from '../auth-rate-limiter'

function setup(limit = 3, windowMs = 1000) {
	let now = 1_000_000
	const limiter = createSlidingWindowLimiter({
		limit,
		windowMs,
		now: () => now,
	})
	return {
		limiter,
		advance: (ms: number) => {
			now += ms
		},
	}
}

describe('createSlidingWindowLimiter', () => {
	it('allows up to the limit and blocks the next hit with retryAfterSeconds', () => {
		const { limiter } = setup(3, 60_000)
		expect(limiter.check('ip:1.1.1.1').allowed).toBe(true)
		expect(limiter.check('ip:1.1.1.1').allowed).toBe(true)
		expect(limiter.check('ip:1.1.1.1').allowed).toBe(true)
		const blocked = limiter.check('ip:1.1.1.1')
		expect(blocked.allowed).toBe(false)
		expect(blocked.retryAfterSeconds).toBe(60)
	})

	it('slides: old hits leave the window one by one', () => {
		const { limiter, advance } = setup(2, 1000)
		limiter.check('k') // t=0
		advance(600)
		limiter.check('k') // t=600
		expect(limiter.check('k').allowed).toBe(false)
		advance(401) // t=1001 -> first hit expired, second still in
		expect(limiter.check('k').allowed).toBe(true)
		expect(limiter.check('k').allowed).toBe(false)
	})

	it('does not count blocked attempts against the window', () => {
		const { limiter, advance } = setup(1, 1000)
		limiter.check('k')
		for (let i = 0; i < 5; i++) limiter.check('k')
		advance(1001)
		expect(limiter.check('k').allowed).toBe(true)
	})

	it('keeps independent counters per key (IP vs email hash)', () => {
		const { limiter } = setup(1)
		expect(limiter.check('ip:9.9.9.9').allowed).toBe(true)
		expect(limiter.check('email:abc').allowed).toBe(true)
		expect(limiter.check('ip:9.9.9.9').allowed).toBe(false)
		expect(limiter.check('email:abc').allowed).toBe(false)
		expect(limiter.check('email:other').allowed).toBe(true)
	})

	it('behaves identically for any key regardless of account existence', () => {
		const a = setup(2)
		const b = setup(2)
		const run = (l: typeof a.limiter, key: string) =>
			[l.check(key), l.check(key), l.check(key)].map((r) => r.allowed)
		expect(run(a.limiter, 'email:existing')).toEqual(
			run(b.limiter, 'email:unknown')
		)
	})

	it('reset clears state and instances do not share state', () => {
		const a = setup(1)
		const b = setup(1)
		a.limiter.check('k')
		expect(a.limiter.check('k').allowed).toBe(false)
		expect(b.limiter.check('k').allowed).toBe(true)
		a.limiter.reset()
		expect(a.limiter.check('k').allowed).toBe(true)
	})

	it('retryAfterSeconds is at least 1', () => {
		const { limiter, advance } = setup(1, 1000)
		limiter.check('k')
		advance(999.9)
		expect(limiter.check('k').retryAfterSeconds).toBe(1)
	})

	it('defaults to the real clock', () => {
		const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 60_000 })
		expect(limiter.check('k').allowed).toBe(true)
		expect(limiter.check('k').allowed).toBe(false)
	})
})

describe('createSlidingWindowLimiter memory bounds (F25)', () => {
	function bounded(options: {
		maxKeys: number
		limit?: number
		windowMs?: number
	}) {
		let now = 1_000_000
		const limiter = createSlidingWindowLimiter({
			limit: options.limit ?? 5,
			windowMs: options.windowMs ?? 1000,
			maxKeys: options.maxKeys,
			now: () => now,
		})
		return {
			limiter,
			advance: (ms: number) => {
				now += ms
			},
		}
	}

	it('sweeps keys whose window is empty so expired keys do not accumulate', () => {
		const { limiter, advance } = bounded({ maxKeys: 1000 })
		for (let i = 0; i < 50; i++) limiter.check(`k${i}`)
		expect(limiter.size()).toBe(50)
		advance(5000)
		limiter.check('fresh')
		expect(limiter.size()).toBe(1)
	})

	it('keeps keys that still have hits inside the window when sweeping', () => {
		const { limiter, advance } = bounded({ maxKeys: 1000, windowMs: 1000 })
		limiter.check('old')
		advance(600)
		limiter.check('recent')
		advance(600) // old expired (t=1200), recent still inside (t=600)
		limiter.check('trigger')
		expect(limiter.size()).toBe(2)
	})

	it('never exceeds maxKeys: unbounded attacker keys evict the least recently used key', () => {
		const { limiter } = bounded({ maxKeys: 3 })
		for (let i = 0; i < 100; i++) limiter.check(`attacker-${i}`)
		expect(limiter.size()).toBe(3)
	})

	it('evicts the least recently used key first', () => {
		const { limiter } = bounded({ maxKeys: 2, limit: 1 })
		limiter.check('a')
		limiter.check('b')
		limiter.check('a') // a is blocked but becomes most recent
		limiter.check('c') // evicts b (least recently used)
		expect(limiter.check('a').allowed).toBe(false) // still tracked
		expect(limiter.check('b').allowed).toBe(true) // was evicted, counted fresh
	})

	it('still enforces the limit while under the cap', () => {
		const { limiter } = bounded({ maxKeys: 10, limit: 2 })
		expect(limiter.check('k').allowed).toBe(true)
		expect(limiter.check('k').allowed).toBe(true)
		expect(limiter.check('k').allowed).toBe(false)
	})

	it('reset empties the store', () => {
		const { limiter } = bounded({ maxKeys: 10 })
		limiter.check('k')
		limiter.reset()
		expect(limiter.size()).toBe(0)
	})
})

describe('createSlidingWindowLimiter globalThis singleton (F25)', () => {
	it('limiters created with the same name share one store (HMR / re-evaluation safe)', () => {
		const name = `test-singleton-${Math.random()}`
		const first = createSlidingWindowLimiter({
			limit: 1,
			windowMs: 60_000,
			name,
		})
		first.check('k')
		const second = createSlidingWindowLimiter({
			limit: 1,
			windowMs: 60_000,
			name,
		})
		expect(second.check('k').allowed).toBe(false)
		first.reset()
	})

	it('limiters without a name keep private state', () => {
		const a = createSlidingWindowLimiter({ limit: 1, windowMs: 60_000 })
		const b = createSlidingWindowLimiter({ limit: 1, windowMs: 60_000 })
		a.check('k')
		expect(b.check('k').allowed).toBe(true)
	})
})
