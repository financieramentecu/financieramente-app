import { describe, it, expect } from 'vitest'
import { isPartnerRequestAllowed } from '../partner-allowlist'

describe('isPartnerRequestAllowed - allowed requests', () => {
	it.each([
		['/dashboard', 'GET'],
		['/dashboard/negocios', 'GET'],
		['/dashboard/negocios/123', 'GET'],
		['/dashboard/negocios/123/edit', 'GET'],
		// Server Actions POST to the page URL
		['/dashboard/negocios/nuevo', 'POST'],
		['/api/auth/session', 'GET'],
		['/api/auth/csrf', 'GET'],
		['/api/auth/signout', 'POST'],
		['/api/auth/callback/google', 'GET'],
		['/api/negocios', 'GET'],
		['/api/negocios/stats', 'GET'],
		['/api/negocios/terms', 'GET'],
		['/api/negocios/export', 'POST'],
		['/api/negocios/validate-contract', 'GET'],
		['/api/negocios/42', 'GET'],
		['/api/negocios/42', 'PUT'],
		['/api/negocios/42/payments', 'GET'],
		['/api/negocios/42/annual-payments', 'GET'],
		['/api/negocios/42/comments', 'GET'],
		['/api/negocios/42/comments', 'POST'],
		['/api/negocios/42/comprobantes', 'GET'],
		['/api/negocios/42/comprobantes', 'POST'],
		['/api/negocios/42/comprobantes/presign', 'POST'],
		['/api/negocios/42/comprobantes/abc-123_X', 'DELETE'],
		['/api/negocios/42/mark-novedad', 'PATCH'],
		['/api/clients/search', 'GET'],
		['/api/products', 'GET'],
		['/api/products/7', 'GET'],
		['/api/origins', 'GET'],
		['/api/periodicities', 'GET'],
		['/api/trm', 'GET'],
		['/api/reports/me', 'GET'],
		['/api/notifications', 'GET'],
		['/api/notifications', 'PUT'],
		['/api/notifications/stream', 'GET'],
		['/api/notifications/9', 'PATCH'],
		['/api/notifications/9', 'DELETE'],
		['/api/production-dashboard/kpis', 'GET'],
		['/api/production-dashboard/by-status', 'GET'],
		['/api/production-dashboard/by-company', 'GET'],
		['/api/production-dashboard/by-origin', 'GET'],
		['/api/production-dashboard/ms-chart', 'GET'],
		['/api/production-dashboard/heatmap', 'GET'],
		['/api/production-dashboard/catalogs', 'GET'],
		['/api/production-dashboard/hierarchy-tree', 'GET'],
		// TRM feeds the dashboard USD conversion
		['/api/trm', 'GET'],
		// Product-owner decision 2026-10-10 (accepted risk)
		['/api/pre-liquidacion/rezagos/autocomplete', 'GET'],
		// Advanced filters catalogs (read only, product-owner decision 2026-10-11)
		['/api/categories', 'GET'],
		['/api/admin/companies', 'GET'],
		// Public account flows must stay reachable
		['/api/account/activate', 'POST'],
		['/api/account/forgot-password', 'POST'],
		['/api/account/reset-password', 'POST'],
	])('allows %s %s', (pathname, method) => {
		expect(isPartnerRequestAllowed(pathname, method)).toBe(true)
	})

	it('treats the HTTP method case-insensitively', () => {
		expect(isPartnerRequestAllowed('/api/negocios', 'get')).toBe(true)
	})
})

describe('isPartnerRequestAllowed - denied requests', () => {
	it.each([
		['/api/negocios/42/cancel', 'PATCH'],
		['/api/negocios/42/manage-novedad', 'PATCH'],
		['/api/negocios/42/fondear', 'POST'],
		['/api/negocios/42/fondear-aportes', 'POST'],
		['/api/negocios/42/date-anchored', 'PATCH'],
		['/api/negocios/42/aportes/1/cartera', 'PATCH'],
		['/api/negocios/42/aportes/1/cartera-pagado', 'POST'],
		['/api/negocios/42/aportes/1/pago-anticipado', 'POST'],
		['/api/negocios/42/aportes/1/date-anchored', 'PATCH'],
		['/api/negocios/cron/fund-payments', 'POST'],
		['/api/production-dashboard/hierarchy-tree', 'POST'],
		['/api/production-dashboard/hierarchy-tree/extra', 'GET'],
		['/api/agents', 'GET'],
		['/api/users/search', 'GET'],
		['/api/admin/users', 'GET'],
		['/api/admin/partners', 'POST'],
		['/api/email/send', 'POST'],
		['/api/health', 'GET'],
		['/api/leads/crm-sync', 'POST'],
		['/api/test-auth', 'POST'],
		['/api/origins/3', 'PUT'],
		// Catalog writes and detail routes stay denied
		['/api/categories', 'POST'],
		['/api/categories/3', 'GET'],
		['/api/categories/3', 'PUT'],
		['/api/categories/3', 'PATCH'],
		['/api/admin/companies', 'POST'],
		['/api/admin/companies/3', 'GET'],
		['/api/admin/companies/3', 'PUT'],
		['/api/admin/companies/3', 'DELETE'],
		['/api/admin/client-origins', 'GET'],
		['/api/admin/currencies', 'GET'],
		['/dashboard/admin/users', 'GET'],
		['/dashboard/calculadora', 'GET'],
		['/dashboard/reportes', 'GET'],
		['/dashboard/liquidaciones', 'GET'],
		['/dashboard/mis-distribuciones', 'GET'],
		['/dashboard/pre-liquidacion', 'GET'],
		['/api/unknown-new-route', 'GET'],
		['/', 'GET'],
		['', 'GET'],
	])('denies %s %s', (pathname, method) => {
		expect(isPartnerRequestAllowed(pathname, method)).toBe(false)
	})
})

describe('isPartnerRequestAllowed - method mismatch', () => {
	it.each([
		['/api/negocios', 'POST'],
		['/api/negocios', 'DELETE'],
		['/api/negocios/42', 'DELETE'],
		['/api/negocios/42', 'PATCH'],
		['/api/negocios/42/payments', 'POST'],
		['/api/negocios/42/mark-novedad', 'POST'],
		['/api/negocios/export', 'GET'],
		['/api/negocios/42/comprobantes/abc', 'GET'],
		['/api/products', 'POST'],
		['/api/products/7', 'PUT'],
		['/api/products/7', 'DELETE'],
		['/api/origins', 'POST'],
		['/api/categories', 'PUT'],
		['/api/categories', 'DELETE'],
		['/api/admin/companies', 'PUT'],
		['/api/admin/companies', 'PATCH'],
		['/api/admin/companies', 'DELETE'],
		['/api/trm', 'POST'],
		['/api/notifications/stream', 'POST'],
		['/api/account/activate', 'GET'],
		['/api/pre-liquidacion/rezagos/autocomplete', 'POST'],
		['/api/negocios/stats', ''],
	])('denies %s %s', (pathname, method) => {
		expect(isPartnerRequestAllowed(pathname, method)).toBe(false)
	})
})

describe('isPartnerRequestAllowed - path tricks', () => {
	it.each([
		// Trailing slash fails closed
		['/api/negocios/', 'GET'],
		['/api/negocios/42/', 'GET'],
		['/api/negocios/1/cancel/', 'PATCH'],
		['/dashboard/', 'GET'],
		['/dashboard/negocios/', 'GET'],
		// Case variations
		['/API/negocios', 'GET'],
		['/api/Negocios', 'GET'],
		['/api/negocios/1/CANCEL', 'PATCH'],
		['/Dashboard/negocios', 'GET'],
		['/dashboard/NEGOCIOS', 'GET'],
		// Segment boundary
		['/dashboard/negociosX', 'GET'],
		['/dashboard/negocios-admin', 'GET'],
		['/dashboardx', 'GET'],
		['/api/negociosX', 'GET'],
		['/api/negocios/statsX', 'GET'],
		['/api/authx/session', 'GET'],
		// Encoded segments
		['/api/negocios/1%2Fcancel', 'PATCH'],
		['/api/negocios/%31', 'GET'],
		['/api/negocios/%2e%2e/admin/users', 'GET'],
		['/api/negocios/1/%63ancel', 'PATCH'],
		['/api/negocios%2F1', 'GET'],
		['/dashboard/negocios/%2e%2e/admin', 'GET'],
		['/api/auth/%2e%2e/admin/users', 'GET'],
		// Traversal and doubled slashes
		['/api/negocios/../admin/users', 'GET'],
		['/api/negocios/1/../../admin/users', 'GET'],
		['/dashboard/negocios/../admin', 'GET'],
		['/api/auth/../admin/users', 'GET'],
		['//api/negocios', 'GET'],
		['/api//negocios', 'GET'],
		['/dashboard/negocios//x', 'GET'],
		// Catalog tricks
		['/api/categories/', 'GET'],
		['/API/categories', 'GET'],
		['/api/categoriesX', 'GET'],
		['/api/categories%2F3', 'GET'],
		['/api/admin/companies/', 'GET'],
		['/api/admin/Companies', 'GET'],
		['/api/admin/companies/../users', 'GET'],
		['/api/admin/companies%2F..%2Fusers', 'GET'],
		['/api/admin//companies', 'GET'],
		['/api/admin/companiesX', 'GET'],
		// Non-numeric ids
		['/api/negocios/abc', 'GET'],
		['/api/negocios/1;x', 'GET'],
		['/api/negocios/1.json', 'GET'],
		// Extra sub-segments
		['/api/negocios/42/payments/extra', 'GET'],
		['/api/negocios/42/comprobantes/presign/extra', 'POST'],
		['/api/notifications/stream/extra', 'GET'],
		// Whitespace and control characters
		['/api/negocios ', 'GET'],
		['/api/negocios\n', 'GET'],
		['/api/negocios?x=1', 'GET'],
		['/api/negocios#x', 'GET'],
	])('denies %s %s', (pathname, method) => {
		expect(isPartnerRequestAllowed(pathname, method)).toBe(false)
	})
})
