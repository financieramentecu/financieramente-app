import { UserRole } from '@/features/auth/lib/roles'
import { RolePermissions } from '@/features/auth/lib/permissions'
import { ALL_MENU_ITEMS, AGENTE_MENU_ITEMS, MenuItem } from './menu-items'

export interface BuildMenuFlags {
	isCalculadoraEnabled?: boolean
	/** Authorized report codes from category permissions (or ADMIN bypass) */
	authorizedReportCodes?: readonly string[]
}

/**
 * Construye el menú de navegación según el rol y permisos del usuario
 */
export function buildMenuByRole(
	role: UserRole | string | null | undefined,
	permissions: RolePermissions | null | undefined,
	flags?: BuildMenuFlags
): MenuItem[] {
	// Si no hay rol, retornar menú vacío
	if (!role || !permissions) {
		return []
	}

	// Agente tiene un menú completamente personalizado
	if (role === UserRole.AGENTE) {
		let items = AGENTE_MENU_ITEMS
		// Si la calculadora está deshabilitada, filtrarla
		if (flags?.isCalculadoraEnabled === false) {
			items = items.filter((item) => item.title !== 'Calculadora')
		}
		// Append authorized Reportes for agents (category-gated)
		const reportesItem = buildReportesMenuItem(flags?.authorizedReportCodes)
		if (reportesItem) {
			items = [...items, reportesItem]
		}
		return items
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

		// Leads (visibilidad de qué leads ve cada usuario se resuelve por jerarquía dentro del módulo)
		if (item.title === 'Leads') {
			if (permissions.leads) {
				filteredItems.push(item)
			}
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

		// Calculadora
		if (item.title === 'Calculadora') {
			if (permissions.calculadora && flags?.isCalculadoraEnabled !== false) {
				filteredItems.push(item)
			}
			continue
		}

		// Mis distribuciones
		if (item.title === 'Mis distribuciones') {
			if (permissions.misDistribuciones) {
				filteredItems.push(item)
			}
			continue
		}

		// Reportes — gated by authorized report codes (category permissions).
		// Legacy stubs without reportCode are hidden.
		if (item.title === 'Reportes') {
			const reportesItem = buildReportesMenuItem(
				flags?.authorizedReportCodes,
				item
			)
			if (reportesItem) {
				filteredItems.push(reportesItem)
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
 * Filters Reportes sub-items by authorized report codes.
 * Items without reportCode (legacy stubs) are never shown.
 */
function buildReportesMenuItem(
	authorizedReportCodes: readonly string[] | undefined,
	baseItem?: MenuItem
): MenuItem | null {
	const codes = authorizedReportCodes ?? []
	if (codes.length === 0) {
		return null
	}

	const source =
		baseItem ??
		ALL_MENU_ITEMS.find((item) => item.title === 'Reportes')

	if (!source) {
		return null
	}

	const subItems = source.subItems?.filter(
		(subItem) =>
			Boolean(subItem.reportCode) && codes.includes(subItem.reportCode!)
	)

	if (!subItems || subItems.length === 0) {
		return null
	}

	return {
		...source,
		url: subItems[0]!.url,
		subItems,
	}
}

/**
 * Obtiene la URL de redirección post-login según el rol
 */
export function getRedirectUrlByRole(
	_role: UserRole | string | null | undefined
): string {
	return '/dashboard/negocios'
}
