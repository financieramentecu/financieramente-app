import { UserRole } from '@/features/auth/lib/roles'
import { RolePermissions } from '@/features/auth/lib/permissions'
import { ALL_MENU_ITEMS, AGENTE_MENU_ITEMS, MenuItem } from './menu-items'

/**
 * Construye el menú de navegación según el rol y permisos del usuario
 */
export function buildMenuByRole(
	role: UserRole | string | null | undefined,
	permissions: RolePermissions | null | undefined,
	flags?: { isSimuladorEnabled?: boolean }
): MenuItem[] {
	// Si no hay rol, retornar menú vacío
	if (!role || !permissions) {
		return []
	}

	// Agente tiene un menú completamente personalizado
	if (role === UserRole.AGENTE) {
		// Si el simulador está deshabilitado, filtrarlo
		if (flags?.isSimuladorEnabled === false) {
			return AGENTE_MENU_ITEMS.filter(item => item.title !== 'Simulador')
		}
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

		// Carga Archivos (usa permiso de cargas)
		if (item.title === 'Carga Archivos' && permissions.cargas.cargaMasiva) {
			filteredItems.push(item)
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

		// Simulador
		if (item.title === 'Simulador') {
			if (flags?.isSimuladorEnabled !== false) {
				filteredItems.push(item)
			}
			continue
		}

		// Mis distribuciones
		if (item.title === 'Mis distribuciones') {
			filteredItems.push(item)
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

		// Administración
		if (
			item.title === 'Administración' &&
			(permissions.administracion || permissions.configuracion)
		) {
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
