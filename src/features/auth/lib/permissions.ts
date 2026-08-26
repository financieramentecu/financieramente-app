import { UserRole } from './roles'

/**
 * Estructura de permisos del sistema
 */
export interface RolePermissions {
	dashboard: boolean
	negocios: {
		create: boolean
		edit: boolean
		list: boolean
		cancel: boolean
		viewAll: boolean // Ver negocios de otros usuarios
	}
	cargas: {
		cargaMasiva: boolean
		historial: boolean
	}
	liquidaciones: {
		preliquidacion: boolean
		liquidacion: boolean
	}
	reportes: {
		all: boolean
		business: boolean
		personal: boolean // Solo reportes personales
	}
	configuracion: boolean
	administracion: boolean
	leads: boolean
	misDistribuciones: boolean
	calculadora: boolean
}

/**
 * Configuración de permisos por rol
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
	[UserRole.ADMIN]: {
		dashboard: true,
		negocios: {
			create: true,
			edit: true,
			list: true,
			cancel: true,
			viewAll: true,
		},
		cargas: {
			cargaMasiva: true,
			historial: true,
		},
		liquidaciones: {
			preliquidacion: true,
			liquidacion: true,
		},
		reportes: {
			all: true,
			business: true,
			personal: true,
		},
		configuracion: true,
		administracion: true,
		leads: true,
		misDistribuciones: true,
		calculadora: true,
	},
	[UserRole.DEFAULT]: {
		dashboard: false,
		negocios: {
			create: false,
			edit: false,
			list: false,
			cancel: false,
			viewAll: false,
		},
		cargas: {
			cargaMasiva: false,
			historial: false,
		},
		liquidaciones: {
			preliquidacion: false,
			liquidacion: false,
		},
		reportes: {
			all: false,
			business: false,
			personal: false,
		},
		configuracion: false,
		administracion: false,
		leads: false,
		misDistribuciones: false,
		calculadora: false,
	},
	[UserRole.ASISTENTE_GERENCIA_OPERATIVA]: {
		dashboard: true,
		negocios: {
			create: true,
			edit: true,
			list: true,
			cancel: true,
			viewAll: true,
		},
		cargas: {
			cargaMasiva: true,
			historial: true,
		},
		liquidaciones: {
			preliquidacion: true,
			liquidacion: true,
		},
		reportes: {
			all: true,
			business: false,
			personal: false,
		},
		configuracion: true,
		administracion: false,
		leads: true,
		misDistribuciones: true,
		calculadora: true,
	},
	[UserRole.ANALISTA_SOPORTE]: {
		dashboard: true,
		negocios: {
			create: true,
			edit: true,
			list: true,
			cancel: true,
			viewAll: false,
		},
		cargas: {
			cargaMasiva: false,
			historial: false,
		},
		liquidaciones: {
			preliquidacion: true,
			liquidacion: false,
		},
		reportes: {
			all: false,
			business: true,
			personal: false,
		},
		configuracion: false,
		administracion: false,
		leads: true,
		misDistribuciones: true,
		calculadora: true,
	},
	[UserRole.AGENTE]: {
		dashboard: true,
		negocios: {
			create: true,
			edit: true,
			list: true,
			cancel: false,
			viewAll: false,
		},
		cargas: {
			cargaMasiva: false,
			historial: false,
		},
		liquidaciones: {
			preliquidacion: false,
			liquidacion: false,
		},
		reportes: {
			all: false,
			business: false,
			personal: false,
		},
		configuracion: false,
		administracion: false,
		leads: true,
		misDistribuciones: true,
		calculadora: true,
	},
	[UserRole.CONSULTOR]: {
		dashboard: true,
		negocios: {
			create: false,
			edit: false,
			list: true,
			cancel: false,
			viewAll: true,
		},
		cargas: {
			cargaMasiva: false,
			historial: false,
		},
		liquidaciones: {
			preliquidacion: false,
			liquidacion: false,
		},
		reportes: {
			all: true,
			business: false,
			personal: false,
		},
		configuracion: false,
		administracion: false,
		leads: false,
		misDistribuciones: false,
		calculadora: true,
	},
}

/**
 * Obtiene los permisos de un rol
 */
export function getRolePermissions(
	role: UserRole | string | null | undefined
): RolePermissions | null {
	if (!role || !isValidRole(role)) {
		return null
	}
	return ROLE_PERMISSIONS[role]
}

/**
 * Valida si un rol tiene un permiso específico
 */
export function hasPermission(
	role: UserRole | string | null | undefined,
	permission: keyof RolePermissions
): boolean {
	const permissions = getRolePermissions(role)
	if (!permissions) {
		return false
	}

	const perm = permissions[permission]
	return typeof perm === 'boolean' ? perm : false
}

/**
 * Valida si un rol tiene un permiso anidado
 */
export function hasNestedPermission(
	role: UserRole | string | null | undefined,
	category: keyof RolePermissions,
	permission: string
): boolean {
	const permissions = getRolePermissions(role)
	if (!permissions) {
		return false
	}

	const categoryPerms = permissions[category]
	if (typeof categoryPerms === 'object' && categoryPerms !== null) {
		return (categoryPerms as Record<string, boolean>)[permission] === true
	}

	return false
}

/**
 * Helper para validar roles
 */
function isValidRole(role: string): role is UserRole {
	return Object.values(UserRole).includes(role as UserRole)
}
