/**
 * PARTNER deny-by-default allowlist.
 *
 * Pure and Edge-safe: no Node-only or database imports. It is evaluated in the
 * middleware `authorized` callback ONLY when the session role is PARTNER.
 *
 * Every pattern is fully anchored and matched against the raw (still
 * percent-encoded) `nextUrl.pathname`, so encoded separators, traversal
 * segments, trailing slashes, case variations and extra sub-segments never
 * match. Ids are restricted to digits and tokens to `[A-Za-z0-9_-]`.
 * Anything not listed here, including routes added in the future, is denied.
 */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type AllowRule = {
	readonly pattern: RegExp
	/** `null` means any HTTP method (used for pages, where Server Actions POST). */
	readonly methods: readonly HttpMethod[] | null
}

const ID = '\\d+'
const TOKEN = '[A-Za-z0-9_-]+'

const PAGE_RULES: readonly AllowRule[] = [
	{ pattern: /^\/dashboard$/, methods: null },
	{ pattern: new RegExp(`^/dashboard/negocios(/${TOKEN})*$`), methods: null },
]

const API_RULES: readonly AllowRule[] = [
	// NextAuth session endpoints (csrf, session, signout, callback/*)
	{
		pattern: new RegExp(`^/api/auth(/${TOKEN})+$`),
		methods: ['GET', 'POST'],
	},
	// Public account flows (activation, forgot/reset password)
	{
		pattern: /^\/api\/account\/(activate|forgot-password|reset-password)$/,
		methods: ['POST'],
	},
	// Negocios collection endpoints
	{
		pattern: /^\/api\/negocios\/(stats|terms|validate-contract)$/,
		methods: ['GET'],
	},
	{ pattern: /^\/api\/negocios$/, methods: ['GET'] },
	{ pattern: /^\/api\/negocios\/export$/, methods: ['POST'] },
	// Single business endpoints
	{ pattern: new RegExp(`^/api/negocios/${ID}$`), methods: ['GET', 'PUT'] },
	{
		pattern: new RegExp(`^/api/negocios/${ID}/(payments|annual-payments)$`),
		methods: ['GET'],
	},
	{
		pattern: new RegExp(`^/api/negocios/${ID}/(comments|comprobantes)$`),
		methods: ['GET', 'POST'],
	},
	{
		pattern: new RegExp(`^/api/negocios/${ID}/comprobantes/presign$`),
		methods: ['POST'],
	},
	{
		pattern: new RegExp(`^/api/negocios/${ID}/comprobantes/${TOKEN}$`),
		methods: ['DELETE'],
	},
	{
		pattern: new RegExp(`^/api/negocios/${ID}/mark-novedad$`),
		methods: ['PATCH'],
	},
	// Catalogs required by the business form (read only)
	{ pattern: /^\/api\/clients\/search$/, methods: ['GET'] },
	{ pattern: new RegExp(`^/api/products(/${ID})?$`), methods: ['GET'] },
	{
		pattern: /^\/api\/(origins|periodicities|trm|reports\/me)$/,
		methods: ['GET'],
	},
	// Advanced-filters catalogs (read only, product-owner decision 2026-10-11).
	// Exact collection GETs only: no detail routes, no writes, no other admin routes.
	{ pattern: /^\/api\/categories$/, methods: ['GET'] },
	{ pattern: /^\/api\/admin\/companies$/, methods: ['GET'] },
	// Notifications
	{ pattern: /^\/api\/notifications$/, methods: ['GET', 'PUT'] },
	{ pattern: /^\/api\/notifications\/stream$/, methods: ['GET'] },
	{
		pattern: new RegExp(`^/api/notifications/${ID}$`),
		methods: ['PATCH', 'DELETE'],
	},
	// Production dashboard. hierarchy-tree answers an EMPTY tree for partners
	// (the route short-circuits on role PARTNER), so the sidebar stays hidden.
	{
		pattern:
			/^\/api\/production-dashboard\/(kpis|by-status|by-company|by-origin|ms-chart|heatmap|catalogs|hierarchy-tree)$/,
		methods: ['GET'],
	},
	// Product-owner decision (2026-10-10): available to partners, accepted risk
	{
		pattern: /^\/api\/pre-liquidacion\/rezagos\/autocomplete$/,
		methods: ['GET'],
	},
]

const ALL_RULES: readonly AllowRule[] = [...PAGE_RULES, ...API_RULES]

export function isPartnerRequestAllowed(
	pathname: string,
	method: string
): boolean {
	const normalizedMethod = method.toUpperCase()
	return ALL_RULES.some(
		(rule) =>
			rule.pattern.test(pathname) &&
			(rule.methods === null ||
				(rule.methods as readonly string[]).includes(normalizedMethod))
	)
}
