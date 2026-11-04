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
	it('ADMIN keeps unconditional Leads/Mis distribuciones/Calculadora (unchanged)', () => {
		const items = titles(UserRole.ADMIN, ['PRODUCCION_REAL'])
		expect(items).toContain('Leads')
		expect(items).toContain('Mis distribuciones')
		expect(items).toContain('Calculadora')
	})

	it('ASISTENTE_GERENCIA_OPERATIVA keeps unconditional Leads/Mis distribuciones/Calculadora (unchanged)', () => {
		const items = titles(UserRole.ASISTENTE_GERENCIA_OPERATIVA, [
			'PRODUCCION_REAL',
		])
		expect(items).toContain('Leads')
		expect(items).toContain('Mis distribuciones')
		expect(items).toContain('Calculadora')
	})

	it('ANALISTA_SOPORTE keeps unconditional Leads/Mis distribuciones/Calculadora (unchanged)', () => {
		const items = titles(UserRole.ANALISTA_SOPORTE, ['PRODUCCION_REAL'])
		expect(items).toContain('Leads')
		expect(items).toContain('Mis distribuciones')
		expect(items).toContain('Calculadora')
	})

	it('DEFAULT sees no menu items (all permissions false, unchanged)', () => {
		expect(titles(UserRole.DEFAULT)).toEqual([])
	})

	it('AGENTE keeps its bespoke menu with Leads and Calculadora (unchanged)', () => {
		const items = buildMenuByRole(UserRole.AGENTE, ROLE_PERMISSIONS[UserRole.AGENTE], {
			isCalculadoraEnabled: true,
		}).map((item) => item.title)
		expect(items).toEqual(['Dashboard', 'Mis Negocios', 'Leads', 'Calculadora'])
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
