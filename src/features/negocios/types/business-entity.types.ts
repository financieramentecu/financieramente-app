/**
 * Tipos de dominio para BusinessEntity
 * Independientes de Prisma, optimizados para la UI
 */

// ============================================
// ESTADOS Y MODOS
// ============================================

/**
 * Estados posibles del negocio
 */
export const BUSINESS_STATUS = {
	VENTA_EFECTUADA: 'VENTA_EFECTUADA',
	EMITIDO: 'EMITIDO',
	LIQUIDADO: 'LIQUIDADO',
	CANCELADO: 'CANCELADO',
	FONDEADO: 'FONDEADO',
	CARTERA: 'CARTERA',
} as const

export type BusinessStatus =
	(typeof BUSINESS_STATUS)[keyof typeof BUSINESS_STATUS]

/**
 * Estados posibles de la "novedad" marcada sobre un negocio.
 * NUEVA: recién marcada por el Money Strategist (sistema, MARK); punto de partida.
 * SOMETIDA_DEVOLUCION | DECLINADA | PENDIENTE | CANCELADA: estados de gestión manual
 * asignados por ANALISTA_SOPORTE/ADMIN vía manage-novedad. Ningún estado es terminal —
 * se puede volver a mover libremente entre los 4 estados manuales.
 */
export const BUSINESS_NOVEDAD_STATUS = {
	NUEVA: 'NUEVA',
	SOMETIDA_DEVOLUCION: 'SOMETIDA_DEVOLUCION',
	DECLINADA: 'DECLINADA',
	PENDIENTE: 'PENDIENTE',
	CANCELADA: 'CANCELADA',
} as const

export type BusinessNovedadStatus =
	(typeof BUSINESS_NOVEDAD_STATUS)[keyof typeof BUSINESS_NOVEDAD_STATUS]

/**
 * Estados de novedad gestionables manualmente vía PATCH /manage-novedad.
 * Excluye NUEVA — ese estado solo lo asigna el flujo automático de MARK.
 */
export const MANUAL_NOVEDAD_STATUSES = [
	BUSINESS_NOVEDAD_STATUS.SOMETIDA_DEVOLUCION,
	BUSINESS_NOVEDAD_STATUS.DECLINADA,
	BUSINESS_NOVEDAD_STATUS.PENDIENTE,
	BUSINESS_NOVEDAD_STATUS.CANCELADA,
] as const

/**
 * Sentinel for advanced filter "Sin novedad" (Business.novedadStatus IS NULL).
 */
export const NOVEDAD_FILTER_SIN_NOVEDAD = 'SIN_NOVEDAD' as const

/**
 * Values accepted by the Novedades advanced filter (multiselect).
 * Empty selection = Todos (no novedad criterion applied).
 */
export const NOVEDAD_FILTER_VALUES = [
	BUSINESS_NOVEDAD_STATUS.NUEVA,
	BUSINESS_NOVEDAD_STATUS.SOMETIDA_DEVOLUCION,
	BUSINESS_NOVEDAD_STATUS.DECLINADA,
	BUSINESS_NOVEDAD_STATUS.PENDIENTE,
	BUSINESS_NOVEDAD_STATUS.CANCELADA,
	NOVEDAD_FILTER_SIN_NOVEDAD,
] as const

export type NovedadFilterValue =
	(typeof NOVEDAD_FILTER_VALUES)[number]

/**
 * Modos del formulario de negocio
 */
export type BusinessFormMode = 'create' | 'edit' | 'view' | 'cancel'

// ============================================
// SUB-ENTIDADES (Información aplanada para UI)
// ============================================

/**
 * Información del cliente aplanada
 */
export interface ClientInfo {
	readonly id: number
	fullName: string
	/** Nombre(s) del cliente (sin apellidos) */
	name: string
	/** Apellido(s) del cliente */
	lastName: string | null
	identityNumber: string
	email: string | null
	phone: string | null
}

/**
 * Información del agente aplanada
 */
export interface AgentInfo {
	readonly id: number
	fullName: string
	roleName: string | null
	categoryName: string | null
	email: string
	phone: string | null
}

/**
 * Información del producto aplanada
 */
export interface ProductInfo {
	readonly id: number
	name: string
	readonly companyId: number
	companyName: string
}

/**
 * Información de moneda
 */
export interface CurrencyInfo {
	readonly id: number
	name: string
}

/**
 * Información de periodicidad
 */
export interface PeriodicityInfo {
	readonly id: number
	name: string
}

/**
 * Información de origen de cliente
 */
export interface ClientOriginInfo {
	readonly id: number
	name: string
}

// ============================================
// ENTIDAD PRINCIPAL
// ============================================

/**
 * Entidad de negocio para la UI
 * Datos aplanados y serializables (JSON-safe)
 */
export interface BusinessEntity {
	readonly id: number
	contract: string | null
	term: number | null
	value: number
	status: BusinessStatus
	readonly createdAt: string // ISO string para serialización
	/** Fecha de primera emisión (ISO); null si nunca estuvo EMITIDO o legacy sin backfill */
	dateIssued: string | null
	/** Fecha de fondeo (ISO); null si el negocio aún no fue fondeado */
	dateAnchored: string | null
	/** Número de aportes calculado para el negocio; null si no aplica */
	numAportes: number | null
	/** Aportes ya fondeados */
	fundedAportes: number
	/** Indica si el negocio tiene pagos asociados */
	hasPayments: boolean
	/** Queda al menos un aporte sin fondear (sigue visible “Fondear”) */
	hasPendingPaymentFunding: boolean
	/** Number of uploaded supports (comprobantes) for this business */
	supportCount: number
	/** Observación de cancelación (prefijada con [CANCELADO] o [ELIMINADO]) */
	observations: string | null
	/** Estado de la novedad marcada sobre el negocio; null si nunca fue marcado */
	novedadStatus: BusinessNovedadStatus | null
	/** Fecha (ISO) en que se marcó la novedad; null si nunca fue marcado */
	novedadMarkedAt: string | null
	/** Fecha (ISO) en que la novedad quedó resuelta; legado — ya no se emite automáticamente */
	novedadResolvedAt: string | null
	client: ClientInfo
	agent: AgentInfo
	product: ProductInfo
	currency: CurrencyInfo
	periodicity: PeriodicityInfo | null
	clientOrigin: ClientOriginInfo
}
