import { describe, expect, it } from 'vitest'
import { buildMenuByRole } from '@/lib/navigation/menu-builder'
import { UserRole } from '@/features/auth/lib/roles'
import { getRolePermissions } from '@/features/auth/lib/permissions'

describe('buildMenuByRole reportes gating', () => {
	const adminPermissions = getRolePermissions(UserRole.ADMIN)

	it('hides Reportes when no authorized codes', () => {
		const menu = buildMenuByRole(UserRole.ADMIN, adminPermissions, {
			authorizedReportCodes: [],
		})
		expect(menu.find((item) => item.title === 'Reportes')).toBeUndefined()
	})

	it('shows Producción Real when PRODUCCION_REAL is authorized', () => {
		const menu = buildMenuByRole(UserRole.ADMIN, adminPermissions, {
			authorizedReportCodes: ['PRODUCCION_REAL'],
		})
		const reportes = menu.find((item) => item.title === 'Reportes')
		expect(reportes).toBeDefined()
		expect(reportes?.subItems?.map((s) => s.title)).toEqual(['Producción Real'])
		expect(reportes?.subItems?.[0]?.reportCode).toBe('PRODUCCION_REAL')
		expect(reportes?.subItems?.[0]?.url).toBe(
			'/dashboard/reportes/produccion-real'
		)
	})

	it('shows Analítica de Leads when LEADS_ANALYTICS is authorized', () => {
		const menu = buildMenuByRole(UserRole.ADMIN, adminPermissions, {
			authorizedReportCodes: ['LEADS_ANALYTICS'],
		})
		const reportes = menu.find((item) => item.title === 'Reportes')
		expect(reportes?.subItems?.map((s) => s.title)).toEqual([
			'Analítica de Leads',
		])
		expect(reportes?.subItems?.[0]?.reportCode).toBe('LEADS_ANALYTICS')
		expect(reportes?.subItems?.[0]?.url).toBe(
			'/dashboard/reportes/leads-analytics'
		)
	})

	it('does not show legacy stub report routes', () => {
		const menu = buildMenuByRole(UserRole.ADMIN, adminPermissions, {
			authorizedReportCodes: ['PRODUCCION_REAL'],
		})
		const reportes = menu.find((item) => item.title === 'Reportes')
		const urls = reportes?.subItems?.map((s) => s.url) ?? []
		expect(urls).not.toContain('/dashboard/reportes/negocio')
		expect(urls).not.toContain('/dashboard/reportes/personales')
	})

	it('keeps Permisos de Reportes under Administración', () => {
		const menu = buildMenuByRole(UserRole.ADMIN, adminPermissions, {
			authorizedReportCodes: [],
		})
		const admin = menu.find((item) => item.title === 'Administración')
		expect(
			admin?.subItems?.some((s) => s.title === 'Permisos de Reportes')
		).toBe(true)
	})
})
