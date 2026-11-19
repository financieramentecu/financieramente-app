/**
 * Public API routes: the ONLY `/api/*` endpoints reachable without a session.
 *
 * Pure and Edge-safe (no Node-only or database imports). The middleware denies
 * every other unauthenticated `/api/*` request with 401 (fail-closed backstop),
 * so a new route that forgets its own `auth()` is no longer open by default.
 *
 * Patterns are fully anchored and matched against the raw `nextUrl.pathname`,
 * so sub-segments, trailing slashes and case variations never match. Routes
 * listed here MUST authenticate themselves (API key, cron secret, token flow)
 * or be intentionally public.
 */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface PublicApiRule {
	readonly pattern: RegExp
	readonly methods: readonly HttpMethod[]
}

const PUBLIC_API_RULES: readonly PublicApiRule[] = [
	// Container / load balancer health probe
	{ pattern: /^\/api\/health$/, methods: ['GET'] },
	// NextAuth owns sign-in, csrf, session and callbacks
	{ pattern: /^\/api\/auth(\/[A-Za-z0-9_-]+)+$/, methods: ['GET', 'POST'] },
	// Public account flows (activation, forgot/reset password)
	{
		pattern: /^\/api\/account\/(activate|forgot-password|reset-password)$/,
		methods: ['POST'],
	},
	// Service-to-service inbound CRM sync (validates `x-api-key` itself)
	{ pattern: /^\/api\/leads\/crm-sync$/, methods: ['POST'] },
	// Scheduled job (validates `Authorization: Bearer CRON_SECRET` itself)
	{ pattern: /^\/api\/negocios\/cron\/fund-payments$/, methods: ['POST'] },
]

export function isPublicApiRequest(pathname: string, method: string): boolean {
	const normalizedMethod = method.toUpperCase()
	return PUBLIC_API_RULES.some(
		(rule) =>
			rule.pattern.test(pathname) &&
			(rule.methods as readonly string[]).includes(normalizedMethod)
	)
}
