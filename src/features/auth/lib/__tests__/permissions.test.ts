import { describe, it, expect } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { ROLE_PERMISSIONS } from '@/features/auth/lib/permissions'

const EXISTING_WRITE_ROLES = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
	UserRole.AGENTE,
] as const

describe('ROLE_PERMISSIONS — leads/misDistribuciones/calculadora flags', () => {
	it.each(EXISTING_WRITE_ROLES)(
		'%s keeps leads/misDistribuciones/calculadora = true (unconditional-push preserved)',
		(role) => {
			expect(ROLE_PERMISSIONS[role].leads).toBe(true)
			expect(ROLE_PERMISSIONS[role].misDistribuciones).toBe(true)
			expect(ROLE_PERMISSIONS[role].calculadora).toBe(true)
		}
	)

	it('DEFAULT has leads/misDistribuciones/calculadora = false (matches existing all-false shape)', () => {
		expect(ROLE_PERMISSIONS[UserRole.DEFAULT].leads).toBe(false)
		expect(ROLE_PERMISSIONS[UserRole.DEFAULT].misDistribuciones).toBe(false)
		expect(ROLE_PERMISSIONS[UserRole.DEFAULT].calculadora).toBe(false)
	})

	it('CONSULTOR gets the read-only-scoped permission set per design D7', () => {
		const perms = ROLE_PERMISSIONS[UserRole.CONSULTOR]
		expect(perms.dashboard).toBe(true)
		expect(perms.negocios).toEqual({
			create: false,
			edit: false,
			list: true,
			cancel: false,
			viewAll: true,
		})
		expect(perms.cargas).toEqual({ cargaMasiva: false, historial: false })
		expect(perms.liquidaciones).toEqual({
			preliquidacion: false,
			liquidacion: false,
		})
		expect(perms.reportes).toEqual({
			all: true,
			business: false,
			personal: false,
		})
		expect(perms.configuracion).toBe(false)
		expect(perms.administracion).toBe(false)
		expect(perms.leads).toBe(false)
		expect(perms.misDistribuciones).toBe(false)
		expect(perms.calculadora).toBe(true)
	})
})
