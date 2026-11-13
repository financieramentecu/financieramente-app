import type {
	DataScopeCode,
	RoleGrants,
	RolePermissionGrant,
} from '../types/access-control.types'
import { PERMISSION_CATALOG } from './permissions.catalog'

/**
 * Initial permissions per role, used to seed `role_permission`.
 *
 * Source: the comparison matrix of the design plus decisions S3-S6 of
 * odd/tasks/roles-permissions-management.md. Grants that the design does not
 * show (marked VERIFY) are a conservative reading of the current code and must
 * be confirmed module by module while migrating the role checks (T5).
 *
 * Column order of every row: ADMIN, ASISTENTE, ANALISTA, AGENTE, CONSULTOR, PARTNER.
 * Cell: `C` company, `E` team, `P` own (scope), `Y` granted without scope, `-` none.
 */
const COLUMNS = [
	'ADMIN',
	'ASISTENTE_GERENCIA_OPERATIVA',
	'ANALISTA_SOPORTE',
	'AGENTE',
	'CONSULTOR',
	'PARTNER',
] as const

type RoleColumn = (typeof COLUMNS)[number]

const SCOPE_BY_CELL: Record<string, DataScopeCode> = {
	C: 'COMPANY',
	E: 'TEAM',
	P: 'OWN',
}

const ROWS: Readonly<Record<string, string>> = {
	'dashboard.ver': 'C C C E C P',

	'negocios.ver': 'C C C E C P', // S3: Analista sees the company
	'negocios.crear': 'Y Y Y Y - Y',
	'negocios.editar': 'C C C E - P',
	'negocios.cancelar': 'Y Y Y - - -',
	'negocios.exportar': 'C C C E C P',
	'negocios.editar_contrato_emitido': 'Y Y Y - - -',
	'negocios.editar_desde_lista': 'Y Y - - - -', // list UI shows Edit to these roles today
	'negocios.editar_fecha_emision': 'Y - Y - - -', // list UI: inline issue-date edit
	'clientes.editar': 'Y Y - - - -',

	'novedades.marcar': 'C C C E - P', // VERIFY
	'novedades.gestionar': 'Y - Y - - -',

	'aportes.ver': 'C C - E - -', // S4: Analista funds but does not view
	'aportes.fondear': 'Y Y Y - - -',
	'aportes.eliminar_fondeado': 'Y Y Y - - -',
	'aportes.pago_anticipado': 'Y Y Y - - -', // legacy: same roles as canFundPayments
	'aportes.cartera': 'Y Y Y - - -', // legacy: same roles as canFundPayments

	'comprobantes.subir': 'C C C E - P', // VERIFY
	'comprobantes.eliminar': 'C C C E - P',
	'comentarios.crear': 'Y Y Y Y - Y', // VERIFY

	'leads.ver': 'C C C E C -', // CONSULTOR keeps company-wide read (legacy global visibility)
	'leads.importar_csv': 'Y Y - - - -',
	'leads.configurar_funnel': 'Y - - - - -',
	'leads.eliminar': 'Y - - - - -',

	'carga.masiva': 'Y - - - - -', // S6: only ADMIN by default
	'carga.historial': 'Y Y - - - -',

	'preliquidacion.ver': 'Y Y Y - - -',
	'preliquidacion.procesar': 'Y Y - - - -',
	'preliquidacion.rezagar': 'Y Y Y - - -',
	'liquidacion.liquidar': 'Y Y - - - -', // S5: Analista off by default
	'liquidacion.notificar': 'Y Y - - - -', // VERIFY

	'distribuciones.ver': 'C C P E - -', // VERIFY Analista scope
	'calculadora.usar': 'Y Y Y Y Y -',

	'reportes.exportar': 'Y Y - - - -',

	'usuarios.ver': 'Y - - - - -',
	'usuarios.gestionar': 'Y - - - - -',
	'usuarios.activar': 'Y - - - - -',
	'usuarios.contrasena': 'Y - - - - -',
	'usuarios.ver_como': 'Y - - - - -',
	'partners.gestionar': 'Y - - - - -',

	'configuracion.catalogos': 'Y - - - - -', // S6
	'configuracion.productos': 'Y - - - - -', // S6
	'configuracion.distribucion': 'Y - - - - -', // S6
	'configuracion.tipos_documento': 'Y - - - - -',
	'reportes.permisos': 'Y - - - - -',

	'roles.ver': 'Y - - - - -',
	'roles.gestionar': 'Y - - - - -',
}

/** Minimum level per role for the permissions that support it (S9). */
const MIN_LEVEL: Readonly<
	Record<string, Partial<Record<RoleColumn, string>>>
> = {
	'negocios.exportar': { AGENTE: 'LEVEL_2' },
}

function buildGrants(column: RoleColumn): RoleGrants {
	const index = COLUMNS.indexOf(column)
	const grants: Record<string, RolePermissionGrant> = {}
	for (const permission of PERMISSION_CATALOG) {
		const cell = ROWS[permission.code]?.split(' ')[index]
		if (!cell || cell === '-') continue
		const scope = SCOPE_BY_CELL[cell]
		const minLevelCode = MIN_LEVEL[permission.code]?.[column]
		grants[permission.code] = {
			...(scope && permission.supportsScope ? { scope } : {}),
			...(minLevelCode ? { minLevelCode } : {}),
		}
	}
	return grants
}

export const DEFAULT_ROLE_GRANTS: Readonly<Record<string, RoleGrants>> = {
	...Object.fromEntries(COLUMNS.map((column) => [column, buildGrants(column)])),
	SIN_ROL: {},
}
