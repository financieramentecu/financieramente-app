import { cache } from 'react'

/**
 * Wraps the zero-argument server-side session read in `React.cache`, so the
 * root layout, the dashboard layout, the page and the role guards of ONE
 * request share a single `auth()` (each one now costs a DB read in the Node
 * `jwt` callback).
 *
 * Caveats (why this is a separate, narrow helper):
 * - `React.cache` keys on argument identity, so only the ZERO-argument form is
 *   memoized. The middleware wrapper form `auth(handler)` and `auth(req, res)`
 *   stay on the raw NextAuth export.
 * - It dedupes inside one React render (layouts, pages, Server Actions run in
 *   that scope) but NOT across Route Handlers, where `cache` is a passthrough.
 */
export function createRequestMemoizedAuth<T>(
	read: () => Promise<T>,
	memoize: <R>(fn: () => Promise<R>) => () => Promise<R> = cache
): () => Promise<T> {
	return memoize(read)
}
