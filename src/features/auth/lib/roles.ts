/**
 * Definición de roles del sistema
 *
 * Los roles definen el nivel de acceso y permisos de los usuarios
 */

export enum UserRole {
	ADMIN = 'ADMIN',
	DEFAULT = 'DEFAULT',
	ASISTENTE_GERENCIA_OPERATIVA = 'ASISTENTE_GERENCIA_OPERATIVA',
	ANALISTA_SOPORTE = 'ANALISTA_SOPORTE',
	AGENTE = 'AGENTE',
	CONSULTOR = 'CONSULTOR',
}

/**
 * Nombres legibles de los roles
 */
export const ROLE_NAMES: Record<UserRole, string> = {
	[UserRole.ADMIN]: 'Administrador del Sistema',
	[UserRole.DEFAULT]: 'Default',
	[UserRole.ASISTENTE_GERENCIA_OPERATIVA]: 'Asistente Operativo de Gerencia',
	[UserRole.ANALISTA_SOPORTE]: 'Analista de Soporte',
	[UserRole.AGENTE]: 'Agente/Coach',
	[UserRole.CONSULTOR]: 'Consultor (Solo Lectura)',
}

/**
 * Descripciones de los roles
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
	[UserRole.ADMIN]:
		'Acceso total a todos los módulos y configuración del sistema',
	[UserRole.DEFAULT]:
		'Rol por defecto asignado a usuarios nuevos pendientes de activación',
	[UserRole.ASISTENTE_GERENCIA_OPERATIVA]:
		'Acceso completo al sistema excepto administración',
	[UserRole.ANALISTA_SOPORTE]:
		'Acceso limitado a negocios y reportes de negocio',
	[UserRole.AGENTE]: 'Solo acceso a sus propios negocios y reportes personales',
	[UserRole.CONSULTOR]:
		'Acceso de solo lectura a Dashboard, Negocios, Reportes y Calculadora, sin permisos de escritura ni exportación',
}

/**
 * Valida si un string es un rol válido
 */
export function isValidRole(role: string): role is UserRole {
	return Object.values(UserRole).includes(role as UserRole)
}

/**
 * Roles with unconditional write authority (create/edit/cancel/fund/export)
 * across the whole system, regardless of hierarchy level.
 * Exact membership mirrors the pre-existing bypass lists
 * (HIERARCHY_BYPASS_ROLES / EXPORT_ADMIN_ROLES) — do not change without
 * re-verifying every consumer's byte-identical behavior.
 */
export const WRITE_BYPASS_ROLES: readonly UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

/**
 * Roles restricted to company-wide read-only access: full visibility,
 * zero write/export authority.
 */
export const READ_ONLY_ROLES: readonly UserRole[] = [UserRole.CONSULTOR]

/**
 * Whether the role has unconditional write authority (bypasses hierarchy
 * level restrictions for create/edit/cancel/fund/export actions).
 */
export function isWriteBypassRole(
	roleCode: string | null | undefined
): boolean {
	if (!roleCode) return false
	return isValidRole(roleCode) && WRITE_BYPASS_ROLES.includes(roleCode)
}

/**
 * Whether the role is restricted to company-wide read-only access
 * (no write, no export, no hierarchy level).
 */
export function isReadOnlyRole(roleCode: string | null | undefined): boolean {
	if (!roleCode) return false
	return isValidRole(roleCode) && READ_ONLY_ROLES.includes(roleCode)
}

/**
 * Whether the role sees company-wide data regardless of hierarchy subtree —
 * true for write-bypass roles AND read-only roles. MUST NOT be used to
 * authorize a write action; only `isWriteBypassRole` may do that.
 */
export function isGlobalVisibilityRole(
	roleCode: string | null | undefined
): boolean {
	return isWriteBypassRole(roleCode) || isReadOnlyRole(roleCode)
}

/**
 * Roles that may update contract when the business is already EMITIDO
 */
export const ROLES_CAN_EDIT_CONTRACT_WHEN_EMITIDO: readonly UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

/**
 * Whether the role may change contract on a business in EMITIDO status
 */
export function canEditContractWhenBusinessEmitido(
	roleCode: string | undefined
): boolean {
	if (roleCode === undefined || roleCode === '') {
		return false
	}
	return (
		isValidRole(roleCode) &&
		ROLES_CAN_EDIT_CONTRACT_WHEN_EMITIDO.includes(roleCode as UserRole)
	)
}

/**
 * Obtiene el nombre legible de un rol
 */
export function getRoleName(role: UserRole | string): string {
	if (isValidRole(role)) {
		return ROLE_NAMES[role]
	}
	return role
}

/**
 * Roles that can view payment installments (aportes)
 */
const ROLES_CAN_VIEW_PAYMENTS: readonly UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.AGENTE,
]

/**
 * Whether the role may view payment installments in the UI
 */
export function canViewPayments(roleCode: string | undefined): boolean {
	if (!roleCode) return false
	return (
		isValidRole(roleCode) &&
		ROLES_CAN_VIEW_PAYMENTS.includes(roleCode as UserRole)
	)
}

/**
 * Roles that can fund payment installments (aportes)
 * AGENTE (Coach) is explicitly excluded — view only
 */
const ROLES_CAN_FUND_PAYMENTS: readonly UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

/**
 * Whether the role may fund payment installments
 * Used for UI guard and API auth
 */
const ROLES_CAN_ELIMINATE_FONDEADO = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

export function canEliminateFondeado(roleCode: string | undefined): boolean {
	if (!roleCode) return false
	return (
		isValidRole(roleCode) &&
		ROLES_CAN_ELIMINATE_FONDEADO.includes(roleCode as UserRole)
	)
}

export function canFundPayments(roleCode: string | undefined): boolean {
	if (!roleCode) return false
	return (
		isValidRole(roleCode) &&
		ROLES_CAN_FUND_PAYMENTS.includes(roleCode as UserRole)
	)
}

/**
 * Roles that can soft-delete business payment supports (comprobantes).
 * Includes Money Strategist (AGENTE) so agents can correct their own uploads
 * without depending on operational analysts (COM-75).
 */
const ROLES_CAN_DELETE_BUSINESS_COMPROBANTE: readonly UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
	UserRole.AGENTE,
]

/**
 * Whether the role may delete (soft-delete) business comprobantes in the UI/API
 */
export function canDeleteBusinessComprobante(
	roleCode: string | undefined
): boolean {
	if (!roleCode) return false
	return (
		isValidRole(roleCode) &&
		ROLES_CAN_DELETE_BUSINESS_COMPROBANTE.includes(roleCode as UserRole)
	)
}
