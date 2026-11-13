/**
 * Definición de roles del sistema
 *
 * Los roles definen el nivel de acceso y permisos de los usuarios
 */

export enum UserRole {
	ADMIN = 'ADMIN',
	SIN_ROL = 'SIN_ROL',
	ASISTENTE_GERENCIA_OPERATIVA = 'ASISTENTE_GERENCIA_OPERATIVA',
	ANALISTA_SOPORTE = 'ANALISTA_SOPORTE',
	AGENTE = 'AGENTE',
	CONSULTOR = 'CONSULTOR',
	PARTNER = 'PARTNER',
}

/**
 * Nombres legibles de los roles
 */
export const ROLE_NAMES: Record<UserRole, string> = {
	[UserRole.ADMIN]: 'Administrador del Sistema',
	[UserRole.SIN_ROL]: 'Sin rol asignado',
	[UserRole.ASISTENTE_GERENCIA_OPERATIVA]: 'Asistente Operativo de Gerencia',
	[UserRole.ANALISTA_SOPORTE]: 'Analista de Soporte',
	[UserRole.AGENTE]: 'Agente/Coach',
	[UserRole.CONSULTOR]: 'Consultor (Solo Lectura)',
	[UserRole.PARTNER]: 'Partner Externo',
}

/**
 * Descripciones de los roles
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
	[UserRole.ADMIN]:
		'Acceso total a todos los módulos y configuración del sistema',
	[UserRole.SIN_ROL]:
		'Usuarios nuevos pendientes de activación. No tiene permisos.',
	[UserRole.ASISTENTE_GERENCIA_OPERATIVA]:
		'Acceso completo al sistema excepto administración',
	[UserRole.ANALISTA_SOPORTE]:
		'Acceso limitado a negocios y reportes de negocio',
	[UserRole.AGENTE]: 'Solo acceso a sus propios negocios y reportes personales',
	[UserRole.CONSULTOR]:
		'Acceso de solo lectura a Dashboard, Negocios, Reportes y Calculadora, sin permisos de escritura. Puede exportar la Lista de Negocios a Excel; el resto de exportaciones permanece restringido',
	[UserRole.PARTNER]:
		'Aliado externo: solo accede a sus propios negocios, sin participar en la distribución de comisiones',
}

/**
 * Valida si un string es un rol válido
 */
export function isValidRole(role: string): role is UserRole {
	return Object.values(UserRole).includes(role as UserRole)
}

/**
 * Roles that own businesses (`Business.idUser`) and are scoped to them:
 * AGENTE (self plus subordinates) and PARTNER (self only).
 */
export const BUSINESS_OWNER_ROLES: readonly UserRole[] = [
	UserRole.AGENTE,
	UserRole.PARTNER,
]

/**
 * Whether the role is a business owner (AGENTE or PARTNER).
 */
export function isBusinessOwnerRole(
	roleCode: string | null | undefined
): boolean {
	if (!roleCode) return false
	return isValidRole(roleCode) && BUSINESS_OWNER_ROLES.includes(roleCode)
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
