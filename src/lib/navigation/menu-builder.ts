import { can } from '@/features/access-control/lib/authorization'
import { menuTemplateForRole } from '@/features/access-control/lib/menu-template'
import type { RoleGrants } from '@/features/access-control/types/access-control.types'
import {
	ALL_MENU_ITEMS,
	AGENTE_MENU_ITEMS,
	PARTNER_MENU_ITEMS,
	CRM_MENU_ITEM,
	MenuItem,
} from './menu-items'

export interface BuildMenuFlags {
	isCalculadoraEnabled?: boolean
	/** Authorized report codes from category permissions (or ADMIN bypass) */
	authorizedReportCodes?: readonly string[]
	/** Person granted a read-only view of other branches' lead states and CRM reports. */
	canViewOthersCrm?: boolean
}

/** Permission that shows each top-level entry of the full menu. */
const ITEM_PERMISSION: Readonly<Record<string, string>> = {
	Dashboard: 'dashboard.ver',
	Negocios: 'negocios.ver',
	'Carga Archivos': 'carga.masiva',
	Calculadora: 'calculadora.usar',
	'Mis distribuciones': 'distribuciones.ver',
	Usuarios: 'usuarios.ver',
	Partners: 'partners.gestionar',
	Roles: 'roles.ver',
}

/** Entries a read-only viewer (can see businesses but not edit them) never gets. */
const HIDDEN_FROM_READ_ONLY: ReadonlySet<string> = new Set(['Mis distribuciones'])

/** Permission behind each Liquidaciones sub-entry. */
const LIQUIDACIONES_PERMISSION: Readonly<Record<string, string>> = {
	Preliquidación: 'preliquidacion.ver',
	Liquidación: 'liquidacion.liquidar',
}

/** Permission behind each Administración sub-entry. */
const ADMIN_SUBITEM_PERMISSION: Readonly<Record<string, string>> = {
	Compañias: 'configuracion.catalogos',
	Productos: 'configuracion.productos',
	'Niveles (Jerarquía)': 'configuracion.catalogos',
	Categorías: 'configuracion.catalogos',
	'Tipo Categoría': 'configuracion.catalogos',
	'Origen Cliente': 'configuracion.catalogos',
	'Config. Producto': 'configuracion.productos',
	'Config. distribución de comisiones': 'configuracion.distribucion',
	'Distribución por defecto': 'configuracion.distribucion',
	Descuentos: 'configuracion.catalogos',
	'Columnas del Funnel de Leads': 'leads.configurar_funnel',
	'Permisos de Reportes': 'reportes.permisos',
	'Tipos de Documento': 'configuracion.tipos_documento',
}

/**
 * Construye el menú de navegación según el rol (plantilla) y los permisos
 * (grants) del usuario. Sin grants (sesión antigua) el menú queda vacío.
 */
export function buildMenuByRole(
	role: string | null | undefined,
	grants: RoleGrants | null | undefined,
	flags?: BuildMenuFlags
): MenuItem[] {
	// Si no hay rol, retornar menú vacío
	if (!role || !grants) {
		return []
	}

	const template = menuTemplateForRole(role)

	// Partner: solo Dashboard y Mis Negocios, sin flags ni reportes (NAV-01)
	if (template === 'PARTNER') {
		return PARTNER_MENU_ITEMS
	}

	// Agente tiene un menú completamente personalizado
	if (template === 'AGENTE') {
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

	const allowed = (code: string) => can(grants, code)
	const isReadOnlyViewer = allowed('negocios.ver') && !allowed('negocios.editar')
	const filteredItems: MenuItem[] = []

	for (const item of ALL_MENU_ITEMS) {
		const permission = ITEM_PERMISSION[item.title]
		if (permission) {
			if (item.title === 'Calculadora' && flags?.isCalculadoraEnabled === false) {
				continue
			}
			if (isReadOnlyViewer && HIDDEN_FROM_READ_ONLY.has(item.title)) continue
			if (allowed(permission)) {
				// Negocios carries the CRM sub-item, gated by its own permission.
				filteredItems.push(
					item.title === 'Negocios' ? buildNegociosMenuItem(item, grants, flags) : item
				)
			}
			continue
		}

		// Liquidaciones
		if (item.title === 'Liquidaciones') {
			const subItems = item.subItems?.filter((subItem) => {
				const code = LIQUIDACIONES_PERMISSION[subItem.title]
				return code !== undefined && allowed(code)
			})
			if (subItems && subItems.length > 0) {
				filteredItems.push({ ...item, subItems })
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

		// Administración: each sub-entry follows its own permission
		if (item.title === 'Administración') {
			const subItems = item.subItems?.filter((subItem) => {
				const code = ADMIN_SUBITEM_PERMISSION[subItem.title]
				return code !== undefined && allowed(code)
			})
			if (subItems && subItems.length > 0) {
				filteredItems.push({ ...item, subItems })
			}
			continue
		}
	}

	return filteredItems
}

/**
 * Keeps the CRM sub-item only for roles with leads access. When only the
 * listing sub-item survives, the entry renders flat (no sub-items).
 */
function buildNegociosMenuItem(
	item: MenuItem,
	grants: RoleGrants,
	flags?: BuildMenuFlags
): MenuItem {
	const canOpenCrm = can(grants, 'leads.gestionar') || flags?.canViewOthersCrm === true
	const subItems = item.subItems?.filter(
		(subItem) => subItem.url !== CRM_MENU_ITEM.url || canOpenCrm
	)

	if (!subItems || subItems.length <= 1) {
		return { ...item, subItems: undefined }
	}

	return { ...item, subItems }
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
	_role: string | null | undefined
): string {
	return '/dashboard/negocios'
}
