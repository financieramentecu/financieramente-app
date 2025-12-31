import { UserRole } from '@/lib/auth/roles'
import { RolePermissions } from '@/lib/auth/permissions'
import { ALL_MENU_ITEMS, AGENTE_MENU_ITEMS, MenuItem } from './menu-items'

/**
 * Construye el menú de navegación según el rol y permisos del usuario
 */
export function buildMenuByRole(
	role: UserRole | string | null | undefined,
	permissions: RolePermissions | null | undefined
): MenuItem[] {
	// Si no hay rol, retornar menú vacío
	if (!role || !permissions) {
		return []
	}

	// Agente tiene un menú completamente personalizado
	if (role === UserRole.AGENTE) {
		return AGENTE_MENU_ITEMS
	}

	// Para otros roles, filtrar items según permisos
	const filteredItems: MenuItem[] = []

	for (const item of ALL_MENU_ITEMS) {
		// Dashboard siempre visible si tiene acceso
		if (item.title === 'Dashboard' && permissions.dashboard) {
			filteredItems.push(item)
			continue
		}

		// Negocios
		if (item.title === 'Negocios' && permissions.negocios.list) {
			filteredItems.push(item)
			continue
		}

		// Cargas
		if (item.title === 'Cargas') {
			if (permissions.cargas.cargaMasiva || permissions.cargas.historial) {
				const subItems = item.subItems?.filter((subItem) => {
					if (subItem.title === 'Carga Masiva')
						return permissions.cargas.cargaMasiva
					if (subItem.title === 'Historial') return permissions.cargas.historial
					return false
				})

				filteredItems.push({
					...item,
					subItems: subItems && subItems.length > 0 ? subItems : undefined,
				})
			}
			continue
		}

		// Liquidaciones
		if (item.title === 'Liquidaciones') {
			if (
				permissions.liquidaciones.preliquidacion ||
				permissions.liquidaciones.liquidacion
			) {
				const subItems = item.subItems?.filter((subItem) => {
					if (subItem.title === 'Preliquidación')
						return permissions.liquidaciones.preliquidacion
					if (subItem.title === 'Liquidación')
						return permissions.liquidaciones.liquidacion
					return false
				})

				filteredItems.push({
					...item,
					subItems: subItems && subItems.length > 0 ? subItems : undefined,
				})
			}
			continue
		}

		// Reportes
		if (item.title === 'Reportes') {
			if (
				permissions.reportes.all ||
				permissions.reportes.business ||
				permissions.reportes.personal
			) {
				const subItems = item.subItems?.filter((subItem) => {
					if (subItem.title === 'Todos los Reportes')
						return permissions.reportes.all
					if (subItem.title === 'Reportes de Negocio')
						return permissions.reportes.business
					if (subItem.title === 'Mis Reportes')
						return permissions.reportes.personal
					return false
				})

				filteredItems.push({
					...item,
					subItems: subItems && subItems.length > 0 ? subItems : undefined,
				})
			}
			continue
		}

		// Usuarios (solo administradores)
		if (item.title === 'Usuarios' && permissions.administracion) {
			filteredItems.push(item)
			continue
		}


	}

	return filteredItems
}

/**
 * Obtiene la URL de redirección post-login según el rol
 */
export function getRedirectUrlByRole(
	role: UserRole | string | null | undefined
): string {
	if (role === UserRole.AGENTE) {
		return '/dashboard/agente'
	}
	return '/dashboard'
}
