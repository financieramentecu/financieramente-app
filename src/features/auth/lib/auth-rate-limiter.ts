/**
 * In-process sliding-window rate limiter for the public account endpoints
 * (forgot-password, activate, reset-password).
 *
 * Memory is bounded: keys whose window is empty are swept (at most once per
 * window, on write) and the store never holds more than `maxKeys` keys; beyond
 * that the least recently used key is evicted, so attacker-supplied keys cannot
 * grow memory without limit. Trade-off: flooding more than `maxKeys` distinct
 * keys can evict a victim's counter; `maxKeys` is large enough that this needs
 * a sustained, high-volume attack.
 *
 * LIMITATION: state lives in this process only (per instance). Production runs
 * a single container today, so the limit is effective; with several instances
 * each would enforce its own window. The upgrade path is a shared store
 * (e.g. a Postgres table) once multi-instance deploys are needed.
 *
 * Callers MUST key by request input (client IP, SHA-256 of the submitted
 * email) and NEVER by whether the account exists, otherwise a 429 would leak
 * account existence (enumeration).
 */

export const DEFAULT_MAX_KEYS = 10_000

export interface SlidingWindowLimiterOptions {
	/** Maximum accepted hits per key inside the window. */
	limit: number
	windowMs: number
	/** Injectable clock (epoch ms) for deterministic tests. */
	now?: () => number
	/** Hard cap on tracked keys (least recently used is evicted). */
	maxKeys?: number
	/**
	 * When set, the store is kept on `globalThis` under this name so it survives
	 * dev HMR / module re-evaluation (one counter set per process).
	 */
	name?: string
}

export interface SlidingWindowResult {
	allowed: boolean
	retryAfterSeconds?: number
}

export interface SlidingWindowLimiter {
	check: (key: string) => SlidingWindowResult
	reset: () => void
	/** Number of tracked keys (observability and tests). */
	size: () => number
}

interface LimiterStore {
	/** Insertion order doubles as recency order (refreshed on every touch). */
	hitsByKey: Map<string, number[]>
	lastSweepAt: number
}

const globalStores = globalThis as typeof globalThis & {
	__slidingWindowLimiterStores?: Map<string, LimiterStore>
}

function resolveStore(
	name: string | undefined,
	startedAt: number
): LimiterStore {
	if (!name) return { hitsByKey: new Map(), lastSweepAt: startedAt }
	const registry = (globalStores.__slidingWindowLimiterStores ??= new Map())
	let store = registry.get(name)
	if (!store) {
		store = { hitsByKey: new Map(), lastSweepAt: startedAt }
		registry.set(name, store)
	}
	return store
}

export function createSlidingWindowLimiter(
	options: SlidingWindowLimiterOptions
): SlidingWindowLimiter {
	const { limit, windowMs } = options
	const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS
	const now = options.now ?? Date.now
	const store = resolveStore(options.name, now())

	/** Drops every key whose newest hit already left the window. */
	function sweep(current: number): void {
		store.lastSweepAt = current
		for (const [key, hits] of store.hitsByKey) {
			if (hits.length === 0 || hits[hits.length - 1] <= current - windowMs) {
				store.hitsByKey.delete(key)
			}
		}
	}

	function makeRoom(current: number): void {
		if (current - store.lastSweepAt >= windowMs) sweep(current)
		if (store.hitsByKey.size >= maxKeys) sweep(current)
		while (store.hitsByKey.size >= maxKeys) {
			const oldest = store.hitsByKey.keys().next()
			if (oldest.done) break
			store.hitsByKey.delete(oldest.value)
		}
	}

	/** Re-inserts so the key becomes the most recently used. */
	function touch(key: string, hits: number[]): void {
		store.hitsByKey.delete(key)
		store.hitsByKey.set(key, hits)
	}

	return {
		check(key) {
			const current = now()
			if (!store.hitsByKey.has(key)) makeRoom(current)
			else if (current - store.lastSweepAt >= windowMs) sweep(current)

			const hitsInWindow = (store.hitsByKey.get(key) ?? []).filter(
				(timestamp) => timestamp > current - windowMs
			)

			if (hitsInWindow.length >= limit) {
				touch(key, hitsInWindow)
				const retryAfterMs = hitsInWindow[0] + windowMs - current
				return {
					allowed: false,
					retryAfterSeconds: Math.max(Math.ceil(retryAfterMs / 1000), 1),
				}
			}

			hitsInWindow.push(current)
			touch(key, hitsInWindow)
			return { allowed: true }
		},
		reset() {
			store.hitsByKey.clear()
		},
		size() {
			return store.hitsByKey.size
		},
	}
}
