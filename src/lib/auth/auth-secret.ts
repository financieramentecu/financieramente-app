/**
 * Resolves the NextAuth signing secret.
 *
 * - Returns `process.env.AUTH_SECRET` (or legacy `NEXTAUTH_SECRET`) when set.
 * - In `development`/`test` envs, falls back to a cryptographically random
 *   per-process value. Sessions don't survive restarts, but the secret is
 *   never predictable to an attacker who reads the repo.
 * - In any other environment (`production`, `qa`, `staging`, …), throws so
 *   misconfigured deployments fail fast instead of silently using a known
 *   fallback.
 */
let devFallback: string | undefined

export function resolveAuthSecret(): string {
	const explicit = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
	if (explicit && explicit.length > 0) {
		return explicit
	}

	const env = process.env.NODE_ENV
	if (env === 'development' || env === 'test') {
		if (!devFallback) {
			devFallback =
				'dev-fallback-secret-key-replace-in-production-never-use-this'
			console.warn(
				`[auth] AUTH_SECRET is not set; using a static per-process secret (env=${env}). ` +
					'Set AUTH_SECRET in your environment to persist sessions across restarts.'
			)
		}
		return devFallback
	}

	throw new Error(
		'AUTH_SECRET is not set. Refusing to start with a fallback secret in ' +
			`env=${env ?? 'unknown'}. Configure AUTH_SECRET (or NEXTAUTH_SECRET) before deploying.`
	)
}
