import { describe, it, expect } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { ROLE_PERMISSIONS } from '@/features/auth/lib/permissions'
import { buildMenuByRole } from '@/lib/navigation/menu-builder'

function titles(role: UserRole, authorizedReportCodes?: readonly string[]) {
	return buildMenuByRole(role, ROLE_PERMISSIONS[role], {
		isCalculadoraEnabled: true,
		authorizedReportCodes,
	}).map((item) => item.title)
}

describe('buildMenuByRole — leads/misDistribuciones/calculadora gating (D7)', () => {
	it('ADMIN keeps unconditional Mis distribuciones/Calculadora (unchanged)', () => {
		const items = titles(UserRole.ADMIN, ['PRODUCCION_REAL'])
		expect(items).toContain('Mis distribuciones')
		expect(items).toContain('Calculadora')
	})

	it('ASISTENTE_GERENCIA_OPERATIVA keeps unconditional Mis distribuciones/Calculadora (unchanged)', () => {
		const items = titles(UserRole.ASISTENTE_GERENCIA_OPERATIVA, [
			'PRODUCCION_REAL',
		])
		expect(items).toContain('Mis distribuciones')
		expect(items).toContain('Calculadora')
	})

	it('ANALISTA_SOPORTE keeps unconditional Mis distribuciones/Calculadora (unchanged)', () => {
		const items = titles(UserRole.ANALISTA_SOPORTE, ['PRODUCCION_REAL'])
		expect(items).toContain('Mis distribuciones')
		expect(items).toContain('Calculadora')
	})

	it('DEFAULT sees no menu items (all permissions false, unchanged)', () => {
		expect(titles(UserRole.DEFAULT)).toEqual([])
	})

	it('AGENTE keeps its bespoke menu with Calculadora', () => {
		const items = buildMenuByRole(UserRole.AGENTE, ROLE_PERMISSIONS[UserRole.AGENTE], {
			isCalculadoraEnabled: true,
		}).map((item) => item.title)
		expect(items).toEqual(['Dashboard', 'Mis Negocios', 'Calculadora'])
	})

	it('CONSULTOR sees exactly Dashboard/Negocios/Reportes/Calculadora', () => {
		const items = titles(UserRole.CONSULTOR, ['PRODUCCION_REAL'])
		expect(items).toEqual(['Dashboard', 'Negocios', 'Calculadora', 'Reportes'])
	})

	it('CONSULTOR never sees Leads or Mis distribuciones', () => {
		const items = titles(UserRole.CONSULTOR, ['PRODUCCION_REAL'])
		expect(items).not.toContain('Leads')
		expect(items).not.toContain('Mis distribuciones')
	})
})

function subItemTitles(role: UserRole, parentTitle: string) {
	return buildMenuByRole(role, ROLE_PERMISSIONS[role], {
		isCalculadoraEnabled: true,
		authorizedReportCodes: ['PRODUCCION_REAL'],
	})
		.find((item) => item.title === parentTitle)
		?.subItems?.map((subItem) => subItem.title)
}

describe('buildMenuByRole — CRM under Negocios (crm-phase-0-foundation)', () => {
	it.each([
		UserRole.ADMIN,
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		UserRole.ANALISTA_SOPORTE,
	])('%s sees Negocios with Ver Negocios and CRM sub-items', (role) => {
		expect(subItemTitles(role, 'Negocios')).toEqual(['Ver Negocios', 'CRM'])
	})

	it.each(Object.values(UserRole))('%s never sees a top-level Leads entry', (role) => {
		expect(titles(role, ['PRODUCCION_REAL'])).not.toContain('Leads')
	})

	it('CRM sub-item links to /dashboard/negocios/crm', () => {
		const negocios = buildMenuByRole(UserRole.ADMIN, ROLE_PERMISSIONS[UserRole.ADMIN]).find(
			(item) => item.title === 'Negocios'
		)
		const crm = negocios?.subItems?.find((subItem) => subItem.title === 'CRM')
		expect(crm?.url).toBe('/dashboard/negocios/crm')
	})

	it('CONSULTOR keeps a flat Negocios entry without CRM', () => {
		expect(subItemTitles(UserRole.CONSULTOR, 'Negocios')).toBeUndefined()
	})

	it('AGENTE sees CRM inside Mis Negocios', () => {
		expect(subItemTitles(UserRole.AGENTE, 'Mis Negocios')).toEqual([
			'Ver Mis Negocios',
			'Crear Negocio',
			'CRM',
		])
	})
})

describe('buildMenuByRole — Partners admin entry (ADM-02)', () => {
	it('ADMIN sees a Partners entry pointing to the Partners module', () => {
		const menu = buildMenuByRole(UserRole.ADMIN, ROLE_PERMISSIONS[UserRole.ADMIN], {
			isCalculadoraEnabled: true,
		})
		const entry = menu.find((item) => item.title === 'Partners')
		expect(entry?.url).toBe('/dashboard/admin/partners')
	})

	it.each(Object.values(UserRole).filter((role) => role !== UserRole.ADMIN))(
		'%s never sees the Partners entry',
		(role) => {
			expect(titles(role, ['PRODUCCION_REAL'])).not.toContain('Partners')
		}
	)
})
