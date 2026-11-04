/**
 * Client IP resolution for the production topology: the app sits behind nginx,
 * which sets `X-Real-IP $remote_addr` (always the socket peer, never client
 * supplied) and APPENDS the peer to `X-Forwarded-For` via
 * `$proxy_add_x_forwarded_for`. Everything before the last XFF hop is
 * attacker-controlled, so the first hop must never be trusted for security
 * decisions such as rate limiting.
 *
 * Edge-safe: no Node-only imports.
 */

/** Shared bucket used when no proxy header is available. */
export const UNKNOWN_CLIENT_IP = 'unknown'

function lastForwardedHop(headers: Headers): string | undefined {
	const hops = (headers.get('x-forwarded-for') ?? '')
		.split(',')
		.map((hop) => hop.trim())
		.filter((hop) => hop.length > 0)
	return hops[hops.length - 1]
}

/** `x-real-ip`, else the LAST `x-forwarded-for` hop, else `undefined`. */
export function resolveTrustedClientIp(headers: Headers): string | undefined {
	const realIp = headers.get('x-real-ip')?.trim()
	if (realIp) return realIp
	return lastForwardedHop(headers)
}

/** Same as {@link resolveTrustedClientIp} but falls back to a constant bucket. */
export function getTrustedClientIp(headers: Headers): string {
	return resolveTrustedClientIp(headers) ?? UNKNOWN_CLIENT_IP
}
