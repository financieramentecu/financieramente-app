import { describe, expect, it } from 'vitest'
import { buildMenuByRole } from '@/lib/navigation/menu-builder'
import { UserRole } from '@/features/auth/lib/roles'
import { DEFAULT_ROLE_GRANTS } from '@/features/access-control/catalog/default-role-grants'

describe('buildMenuByRole reportes gating', () => {
	const adminPermissions = DEFAULT_ROLE_GRANTS[UserRole.ADMIN]

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

	it('shows ABA-MFUND iff ABA_MFUND is authorized', () => {
		const menu = buildMenuByRole(UserRole.ADMIN, adminPermissions, {
			authorizedReportCodes: ['ABA_MFUND'],
		})
		const reportes = menu.find((item) => item.title === 'Reportes')
		expect(reportes).toBeDefined()
		expect(reportes?.subItems?.map((s) => s.title)).toEqual(['ABA-MFUND'])
		expect(reportes?.subItems?.[0]?.reportCode).toBe('ABA_MFUND')
		expect(reportes?.subItems?.[0]?.url).toBe('/dashboard/reportes/aba-mfund')
	})

	it('hides ABA-MFUND when ABA_MFUND is not authorized', () => {
		const menu = buildMenuByRole(UserRole.ADMIN, adminPermissions, {
			authorizedReportCodes: ['PRODUCCION_REAL'],
		})
		const reportes = menu.find((item) => item.title === 'Reportes')
		const titles = reportes?.subItems?.map((s) => s.title) ?? []
		expect(titles).not.toContain('ABA-MFUND')
		expect(titles).toEqual(['Producción Real'])
	})

	it('keeps Producción Real independently visible when only PRODUCCION_REAL is authorized', () => {
		const menu = buildMenuByRole(UserRole.AGENTE, DEFAULT_ROLE_GRANTS[UserRole.AGENTE], {
			authorizedReportCodes: ['PRODUCCION_REAL'],
		})
		const reportes = menu.find((item) => item.title === 'Reportes')
		expect(reportes?.subItems?.map((s) => s.title)).toEqual(['Producción Real'])
		expect(reportes?.subItems?.some((s) => s.reportCode === 'ABA_MFUND')).toBe(
			false
		)
	})

	it('lets ADMIN authorized-codes include both Producción Real and ABA-MFUND', () => {
		const menu = buildMenuByRole(UserRole.ADMIN, adminPermissions, {
			authorizedReportCodes: ['PRODUCCION_REAL', 'ABA_MFUND'],
		})
		const reportes = menu.find((item) => item.title === 'Reportes')
		expect(reportes?.subItems?.map((s) => s.title)).toEqual([
			'Producción Real',
			'ABA-MFUND',
		])
		expect(reportes?.subItems?.map((s) => s.reportCode)).toEqual([
			'PRODUCCION_REAL',
			'ABA_MFUND',
		])
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

	it('shows Tipos de Documento only to the system administrator (S6)', () => {
		const adminMenu = buildMenuByRole(UserRole.ADMIN, adminPermissions, {
			authorizedReportCodes: [],
		})
		const assistantMenu = buildMenuByRole(
			UserRole.ASISTENTE_GERENCIA_OPERATIVA,
			DEFAULT_ROLE_GRANTS[UserRole.ASISTENTE_GERENCIA_OPERATIVA],
			{ authorizedReportCodes: [] }
		)

		const adminItem = adminMenu.find((item) => item.title === 'Administración')
		const assistantItem = assistantMenu.find(
			(item) => item.title === 'Administración'
		)

		expect(
			adminItem?.subItems?.some((item) => item.title === 'Tipos de Documento')
		).toBe(true)
		// S6: configuration is ADMIN-only by default, so the assistant gets no
		// Administración entry at all (activable from the roles editor)
		expect(assistantItem).toBeUndefined()
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
