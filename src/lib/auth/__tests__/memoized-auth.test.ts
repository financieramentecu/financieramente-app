import { describe, it, expect, vi } from 'vitest'
import { createRequestMemoizedAuth } from '../memoized-auth'

describe('createRequestMemoizedAuth (F5)', () => {
	it('hands React.cache a ZERO-argument function so every call shares one cache entry', () => {
		const read = vi.fn().mockResolvedValue(null)
		const memoize = vi.fn((fn: () => Promise<unknown>) => fn)
		createRequestMemoizedAuth(read, memoize as never)
		expect(memoize).toHaveBeenCalledTimes(1)
		expect(memoize.mock.calls[0][0]).toHaveLength(0)
	})

	it('calls the underlying reader once per request scope, however many callers', async () => {
		const read = vi.fn().mockResolvedValue({ user: { id: '1' } })
		// Minimal per-request cache: first call stores the promise.
		let scope = new Map<object, Promise<unknown>>()
		const scopedCache = <T>(fn: () => Promise<T>) => {
			return () => {
				if (!scope.has(fn)) scope.set(fn, fn())
				return scope.get(fn) as Promise<T>
			}
		}
		const auth = createRequestMemoizedAuth(read, scopedCache as never)

		await Promise.all([auth(), auth(), auth()])
		expect(read).toHaveBeenCalledTimes(1)

		scope = new Map() // next request
		await auth()
		expect(read).toHaveBeenCalledTimes(2)
	})

	it('returns what the reader returned (null session included)', async () => {
		const read = vi.fn().mockResolvedValue(null)
		const auth = createRequestMemoizedAuth(read)
		expect(await auth()).toBeNull()
	})
})
