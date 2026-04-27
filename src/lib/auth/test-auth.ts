/**
 * E2E test-auth bypass helper.
 *
 * The legacy bypass was gated on `process.env.NODE_ENV !== 'production'`, which
 * also matched `NODE_ENV=qa` / `NODE_ENV=staging` and other non-prod envs,
 * effectively letting any caller bypass authentication by sending the
 * `x-test-auth: true` header on QA deployments.
 *
 * This helper enforces two conditions that must BOTH be true for the bypass
 * to apply:
 *
 * 1. `NODE_ENV === 'test'` — QA and any other env are excluded.
 * 2. A server-side secret `E2E_TEST_AUTH_TOKEN` is configured AND the caller
 *    sends it in an `x-test-auth-token` header whose value matches exactly.
 *
 * If the secret is not configured, the bypass is disabled unconditionally.
 */

type HeaderReader = (name: string) => string | null | undefined

/**
 * Returns true when the incoming request is allowed to use the e2e bypass.
 */
export function isE2ETestAuthAllowed(getHeader: HeaderReader): boolean {
	if (process.env.NODE_ENV !== 'test') return false

	const expected = process.env.E2E_TEST_AUTH_TOKEN
	if (!expected) return false

	if (getHeader('x-test-auth') !== 'true') return false

	const provided = getHeader('x-test-auth-token')
	return typeof provided === 'string' && provided === expected
}
