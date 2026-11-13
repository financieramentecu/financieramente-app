import { describe, it, expect } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import {
	isGlobalVisibilityRole,
	canDeleteBusinessComprobante,
	canEditContractWhenBusinessEmitido,
	canEliminateFondeado,
	canFundPayments,
	canViewPayments,
} from '@/features/auth/lib/roles'
import { ROLE_PERMISSIONS } from '@/features/auth/lib/permissions'
import { DEFAULT_ROLE_GRANTS } from '../catalog/default-role-grants'
import { can, getScope } from '../lib/authorization'

/**
 * Safety net of the migration (T5): the default grants must reproduce what the
 * hardcoded role checks decide today. A divergence here is a behavior change.
 */
const ROLES = Object.values(UserRole)

/**
 * Deliberate product decisions (S6) that differ from the legacy table: the
 * ASISTENTE no longer gets mass upload or configuration by default. Both only
 * drive menu visibility today; they stay activable from the roles editor.
 */
const INTENTIONAL_DIVERGENCES: Partial<
	Record<UserRole, { cargaMasiva: boolean; configuracion: boolean }>
> = {
	[UserRole.ASISTENTE_GERENCIA_OPERATIVA]: {
		cargaMasiva: false,
		configuracion: false,
	},
}

describe.each(ROLES)('default grants vs legacy checks: %s', (role) => {
	const grants = DEFAULT_ROLE_GRANTS[role]
	const legacy = ROLE_PERMISSIONS[role]

	it('has default grants defined', () => {
		expect(grants).toBeDefined()
	})

	it('matches the ROLE_PERMISSIONS table', () => {
		expect({
			dashboard: can(grants, 'dashboard.ver'),
			create: can(grants, 'negocios.crear'),
			edit: can(grants, 'negocios.editar'),
			list: can(grants, 'negocios.ver'),
			cancel: can(grants, 'negocios.cancelar'),
			viewAll: getScope(grants, 'negocios.ver') === 'COMPANY',
			cargaMasiva: can(grants, 'carga.masiva'),
			historial: can(grants, 'carga.historial'),
			preliquidacion: can(grants, 'preliquidacion.ver'),
			liquidacion: can(grants, 'liquidacion.liquidar'),
			configuracion: can(grants, 'configuracion.catalogos'),
			administracion: can(grants, 'usuarios.ver'),
			leads: can(grants, 'leads.ver'),
			misDistribuciones: can(grants, 'distribuciones.ver'),
			calculadora: can(grants, 'calculadora.usar'),
		}).toEqual({
			dashboard: legacy.dashboard,
			create: legacy.negocios.create,
			edit: legacy.negocios.edit,
			list: legacy.negocios.list,
			cancel: legacy.negocios.cancel,
			// the table's `viewAll` is stale: real visibility is isGlobalVisibilityRole
			viewAll: isGlobalVisibilityRole(role),
			cargaMasiva:
				INTENTIONAL_DIVERGENCES[role]?.cargaMasiva ?? legacy.cargas.cargaMasiva,
			historial: legacy.cargas.historial,
			preliquidacion: legacy.liquidaciones.preliquidacion,
			liquidacion: legacy.liquidaciones.liquidacion,
			configuracion:
				INTENTIONAL_DIVERGENCES[role]?.configuracion ?? legacy.configuracion,
			administracion: legacy.administracion,
			leads: legacy.leads,
			misDistribuciones: legacy.misDistribuciones,
			calculadora: legacy.calculadora,
		})
	})

	it('matches the role helper functions', () => {
		expect({
			emitido: can(grants, 'negocios.editar_contrato_emitido'),
			viewPayments: can(grants, 'aportes.ver'),
			fund: can(grants, 'aportes.fondear'),
			eliminate: can(grants, 'aportes.eliminar_fondeado'),
			deleteComprobante: can(grants, 'comprobantes.eliminar'),
		}).toEqual({
			emitido: canEditContractWhenBusinessEmitido(role),
			viewPayments: canViewPayments(role),
			fund: canFundPayments(role),
			eliminate: canEliminateFondeado(role),
			deleteComprobante: canDeleteBusinessComprobante(role),
		})
	})
})
