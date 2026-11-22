import type { PermissionDefinition } from '../types/access-control.types'

type Row = readonly [
	code: string,
	name: string,
	options?: { scope?: true; minLevel?: true },
]

function module(
	moduleName: string,
	rows: readonly Row[]
): PermissionDefinition[] {
	return rows.map(([code, name, options]) => ({
		code,
		name,
		module: moduleName,
		supportsScope: options?.scope === true,
		supportsMinLevel: options?.minLevel === true,
	}))
}

/**
 * Single source of truth for the permissions that exist in the system.
 * Admins assign these to roles but cannot create new ones: every permission
 * must be checked by code. Synced to the `permission` table (see
 * `prisma/seeds/permissions.ts`).
 */
export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
	...module('Dashboard', [['dashboard.ver', 'Ver dashboard', { scope: true }]]),
	...module('Negocios', [
		['negocios.ver', 'Ver negocios', { scope: true }],
		['negocios.crear', 'Crear negocio'],
		[
			'negocios.asignar_strategist',
			'Asignar el Money Strategist al crear un negocio',
			{ scope: true },
		],
		['negocios.editar', 'Editar negocio', { scope: true }],
		['negocios.cancelar', 'Cancelar negocio'],
		['negocios.editar_valor', 'Editar el Valor de Negocio'],
		[
			'negocios.exportar',
			'Exportar lista de negocios a Excel',
			{ scope: true, minLevel: true },
		],
		[
			'negocios.editar_contrato_emitido',
			'Editar contrato y datos financieros de un negocio EMITIDO',
		],
		['negocios.editar_desde_lista', 'Mostrar la acción Editar en la lista'],
		['negocios.editar_fecha_emision', 'Editar la fecha de emisión desde la lista'],
		['clientes.editar', 'Editar datos del cliente'],
	]),
	...module('Novedades', [
		['novedades.marcar', 'Marcar novedad', { scope: true }],
		['novedades.gestionar', 'Gestionar novedad'],
		['novedades.desmarcar_ajenas', 'Desmarcar la novedad de cualquier negocio'],
	]),
	...module('Aportes y pagos', [
		['aportes.ver', 'Ver aportes', { scope: true }],
		['aportes.fondear', 'Fondear aportes'],
		['aportes.eliminar_fondeado', 'Eliminar fondeado'],
		['aportes.pago_anticipado', 'Registrar pago anticipado'],
		['aportes.cartera', 'Gestionar cartera'],
	]),
	...module('Comprobantes y comentarios', [
		['comprobantes.subir', 'Subir comprobantes', { scope: true }],
		['comprobantes.eliminar', 'Eliminar comprobantes', { scope: true }],
		['comentarios.crear', 'Comentar en negocios'],
	]),
	...module('Leads', [
		['leads.ver', 'Ver leads', { scope: true }],
		['leads.gestionar', 'Abrir y gestionar el CRM de leads', { scope: true }],
		['leads.reasignar_estrategia', 'Cambiar el Money Strategy de cualquier lead'],
		['leads.importar_csv', 'Importar leads desde CSV'],
		['leads.configurar_funnel', 'Configurar columnas del funnel'],
		['leads.eliminar', 'Eliminar leads'],
		['leads.configurar_avisos', 'Configurar los avisos de vencimiento de tareas del CRM'],
	]),
	...module('Carga de archivos', [
		['carga.masiva', 'Carga masiva de archivos'],
		['carga.ver_todos', 'Ver las cargas de todos los usuarios'],
		['carga.historial', 'Ver historial de cargas'],
	]),
	...module('Liquidaciones', [
		['preliquidacion.ver', 'Ver preliquidación'],
		['preliquidacion.procesar', 'Procesar preliquidación'],
		['preliquidacion.rezagar', 'Rezagar registros'],
		['liquidacion.ver', 'Ver comisiones liquidadas'],
		['liquidacion.liquidar', 'Liquidar'],
		['liquidacion.notificar', 'Notificar liquidación'],
	]),
	...module('Herramientas', [
		['distribuciones.ver', 'Ver mis distribuciones', { scope: true }],
		['calculadora.usar', 'Usar calculadora'],
	]),
	...module('Reportes', [['reportes.ver_todos', 'Ver todos los reportes sin restricción de categoría'],
		['reportes.exportar', 'Exportar reportes']]),
	...module('Usuarios y Partners', [
		['usuarios.ver', 'Ver usuarios'],
		['usuarios.gestionar', 'Crear y editar usuarios'],
		['usuarios.activar', 'Activar / desactivar usuarios'],
		['usuarios.contrasena', 'Asignar contraseña'],
		['usuarios.ver_como', 'Ver como otro usuario'],
		['partners.gestionar', 'Gestionar partners'],
	]),
	...module('Configuración', [
		['configuracion.catalogos', 'Catálogos (compañías, categorías, orígenes, monedas)'],
		['configuracion.productos', 'Productos y configuración de producto'],
		['configuracion.distribucion', 'Distribución de comisiones y descuentos'],
		['configuracion.correo', 'Enviar y probar correos del sistema'],
		['configuracion.tipos_documento', 'Tipos de documento'],
		['reportes.permisos', 'Permisos de reportes'],
	]),
	...module('Roles y permisos', [
		['roles.ver', 'Ver roles'],
		['roles.gestionar', 'Crear, editar y asignar roles'],
	]),
]

export const PERMISSION_CODES: ReadonlySet<string> = new Set(
	PERMISSION_CATALOG.map((permission) => permission.code)
)
