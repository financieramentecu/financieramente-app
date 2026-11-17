import { describe, it, expect } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { DEFAULT_ROLE_GRANTS } from '../catalog/default-role-grants'
import { can, getScope } from '../lib/authorization'

/**
 * Contract of the default grants: who holds each permission when nobody has
 * edited anything. These sets reproduce what the hardcoded role checks decided
 * before the roles & permissions administration existed, plus the product
 * decisions S3-S6 (see odd/tasks/roles-permissions-management.md). A change
 * here is a behavior change for every environment on `defaults`.
 */
const ADMIN = UserRole.ADMIN
const ASISTENTE = UserRole.ASISTENTE_GERENCIA_OPERATIVA
const ANALISTA = UserRole.ANALISTA_SOPORTE
const AGENTE = UserRole.AGENTE
const CONSULTOR = UserRole.CONSULTOR
const PARTNER = UserRole.PARTNER

const ROLES = Object.values(UserRole)
const sorted = (roles: readonly string[]) => [...roles].sort()
const rolesWith = (code: string) =>
	ROLES.filter((role) => can(DEFAULT_ROLE_GRANTS[role], code)).sort()

const HOLDERS: Readonly<Record<string, readonly UserRole[]>> = {
	// negocios
	'dashboard.ver': [ADMIN, ASISTENTE, ANALISTA, AGENTE, CONSULTOR, PARTNER],
	'negocios.ver': [ADMIN, ASISTENTE, ANALISTA, AGENTE, CONSULTOR, PARTNER],
	'negocios.crear': [ADMIN, ASISTENTE, ANALISTA, AGENTE, PARTNER],
	'negocios.asignar_strategist': [ADMIN, ASISTENTE, ANALISTA, AGENTE, PARTNER],
	'negocios.editar': [ADMIN, ASISTENTE, ANALISTA, AGENTE, PARTNER],
	'negocios.cancelar': [ADMIN, ASISTENTE, ANALISTA],
	'negocios.exportar': [ADMIN, ASISTENTE, ANALISTA, AGENTE, CONSULTOR, PARTNER],
	'negocios.editar_contrato_emitido': [ADMIN, ASISTENTE, ANALISTA],
	'negocios.editar_desde_lista': [ADMIN, ASISTENTE],
	'negocios.editar_fecha_emision': [ADMIN, ANALISTA],
	'clientes.editar': [ADMIN, ASISTENTE],
	// aportes y comprobantes
	'aportes.ver': [ADMIN, ASISTENTE, AGENTE],
	'aportes.fondear': [ADMIN, ASISTENTE, ANALISTA],
	'aportes.eliminar_fondeado': [ADMIN, ASISTENTE, ANALISTA],
	'aportes.pago_anticipado': [ADMIN, ASISTENTE, ANALISTA],
	'aportes.cartera': [ADMIN, ASISTENTE, ANALISTA],
	'comprobantes.eliminar': [ADMIN, ASISTENTE, ANALISTA, AGENTE, PARTNER],
	// novedades
	'novedades.marcar': [ADMIN, ASISTENTE, ANALISTA, AGENTE, PARTNER],
	'novedades.gestionar': [ADMIN, ANALISTA],
	'novedades.desmarcar_ajenas': [ADMIN, ASISTENTE],
	// leads y liquidacion
	'leads.ver': [ADMIN, ASISTENTE, ANALISTA, AGENTE, CONSULTOR],
	'preliquidacion.ver': [ADMIN, ASISTENTE, ANALISTA],
	'preliquidacion.procesar': [ADMIN, ASISTENTE],
	'preliquidacion.rezagar': [ADMIN, ASISTENTE, ANALISTA],
	'liquidacion.ver': [ADMIN, ASISTENTE, ANALISTA, AGENTE, CONSULTOR],
	'liquidacion.liquidar': [ADMIN, ASISTENTE], // S5: not ANALISTA
	'liquidacion.notificar': [ADMIN, ASISTENTE],
	'distribuciones.ver': [ADMIN, ASISTENTE, ANALISTA, AGENTE, CONSULTOR],
	'calculadora.usar': [ADMIN, ASISTENTE, ANALISTA, AGENTE, CONSULTOR],
	// carga, reportes
	'carga.masiva': [ADMIN], // S6
	'carga.ver_todos': [ADMIN],
	'reportes.exportar': [ADMIN, ASISTENTE, ANALISTA, AGENTE],
	'reportes.ver_todos': [ADMIN, CONSULTOR],
	// administracion (S6: ADMIN only by default)
	'usuarios.ver': [ADMIN],
	'partners.gestionar': [ADMIN],
	'configuracion.catalogos': [ADMIN],
	'configuracion.distribucion': [ADMIN],
	'roles.gestionar': [ADMIN],
}

describe('default grants contract', () => {
	it.each(Object.entries(HOLDERS))(
		'%s is held by exactly the expected roles',
		(code, roles) => {
			expect(rolesWith(code)).toEqual(sorted(roles))
		}
	)

	it('SIN_ROL holds nothing', () => {
		expect(DEFAULT_ROLE_GRANTS[UserRole.SIN_ROL]).toEqual({})
	})

	it('shows Edit in the list only to ADMIN and ASISTENTE (the API also lets ANALISTA edit)', () => {
		expect(rolesWith('negocios.editar_desde_lista')).toEqual(
			sorted([ADMIN, ASISTENTE])
		)
		expect(rolesWith('negocios.editar')).toContain(ANALISTA)
	})

	it('keeps company-wide visibility for the backoffice roles and the read-only CONSULTOR', () => {
		const company = ROLES.filter(
			(role) =>
				getScope(DEFAULT_ROLE_GRANTS[role], 'negocios.ver') === 'COMPANY'
		).sort()
		expect(company).toEqual(sorted([ADMIN, ASISTENTE, ANALISTA, CONSULTOR]))
	})

	it('treats AGENTE and PARTNER as the owner-scoped (coach) roles', () => {
		const owners = ROLES.filter((role) =>
			['OWN', 'TEAM'].includes(
				getScope(DEFAULT_ROLE_GRANTS[role], 'negocios.ver') ?? ''
			)
		).sort()
		expect(owners).toEqual(sorted([AGENTE, PARTNER]))
	})
})
