/**
 * Definición de roles del sistema
 *
 * Los roles definen el nivel de acceso y permisos de los usuarios
 */

export enum UserRole {
	DEFAULT = 'DEFAULT',
	ASISTENTE_GERENCIA_OPERATIVA = 'ASISTENTE_GERENCIA_OPERATIVA',
	ANALISTA_SOPORTE = 'ANALISTA_SOPORTE',
	AGENTE = 'AGENTE',
}

/**
 * Nombres legibles de los roles
 */
export const ROLE_NAMES: Record<UserRole, string> = {
	[UserRole.DEFAULT]: 'Default',
	[UserRole.ASISTENTE_GERENCIA_OPERATIVA]: 'Asistente Operativo de Gerencia',
	[UserRole.ANALISTA_SOPORTE]: 'Analista de Soporte',
	[UserRole.AGENTE]: 'Agente/Coach',
}

/**
 * Descripciones de los roles
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
	[UserRole.DEFAULT]:
		'Rol por defecto asignado a usuarios nuevos pendientes de activación',
	[UserRole.ASISTENTE_GERENCIA_OPERATIVA]:
		'Acceso completo al sistema excepto administración',
	[UserRole.ANALISTA_SOPORTE]:
		'Acceso limitado a negocios y reportes de negocio',
	[UserRole.AGENTE]: 'Solo acceso a sus propios negocios y reportes personales',
}

/**
 * Valida si un string es un rol válido
 */
export function isValidRole(role: string): role is UserRole {
	return Object.values(UserRole).includes(role as UserRole)
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
