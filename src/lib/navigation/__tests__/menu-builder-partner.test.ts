import { describe, it, expect } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { ROLE_PERMISSIONS } from '@/features/auth/lib/permissions'
import { buildMenuByRole } from '@/lib/navigation/menu-builder'
import {
	AGENTE_MENU_ITEMS,
	PARTNER_MENU_ITEMS,
} from '@/lib/navigation/menu-items'

const ALL_REPORT_CODES = ['PRODUCCION_REAL', 'OTHER_REPORT']

describe('buildMenuByRole - PARTNER (NAV-01, PA-02)', () => {
	it('contains exactly Dashboard and Mis Negocios', () => {
		const items = buildMenuByRole(
			UserRole.PARTNER,
			ROLE_PERMISSIONS[UserRole.PARTNER],
			{
				isCalculadoraEnabled: true,
			}
		)

		expect(items.map((i) => i.title)).toEqual(['Dashboard', 'Mis Negocios'])
		expect(items.map((i) => i.url)).toEqual([
			'/dashboard',
			'/dashboard/negocios',
		])
	})

	it('ignores the calculadora flag and authorized report codes', () => {
		const items = buildMenuByRole(
			UserRole.PARTNER,
			ROLE_PERMISSIONS[UserRole.PARTNER],
			{
				isCalculadoraEnabled: true,
				authorizedReportCodes: ALL_REPORT_CODES,
			}
		)

		const titles = items.map((i) => i.title)
		for (const forbidden of [
			'Reportes',
			'Liquidaciones',
			'Calculadora',
			'Mis distribuciones',
			'Carga Archivos',
			'Leads',
			'Usuarios',
			'Partners',
			'Administración',
		]) {
			expect(titles).not.toContain(forbidden)
		}
		expect(titles).toHaveLength(2)
	})

	it('only links to routes the partner allowlist can open', () => {
		const urls = PARTNER_MENU_ITEMS.flatMap((item) => [
			item.url,
			...(item.subItems?.map((sub) => sub.url) ?? []),
		])

		for (const url of urls) {
			expect(
				url === '/dashboard' || url.startsWith('/dashboard/negocios')
			).toBe(true)
		}
	})

	it('returns an empty menu without permissions (unchanged guard)', () => {
		expect(buildMenuByRole(UserRole.PARTNER, null)).toEqual([])
	})

	it('keeps the AGENTE menu unchanged', () => {
		const items = buildMenuByRole(
			UserRole.AGENTE,
			ROLE_PERMISSIONS[UserRole.AGENTE],
			{
				isCalculadoraEnabled: true,
			}
		)

		expect(items).toEqual(AGENTE_MENU_ITEMS)
		expect(items.map((i) => i.title)).toEqual([
			'Dashboard',
			'Mis Negocios',
			'Leads',
			'Calculadora',
		])
	})
})
