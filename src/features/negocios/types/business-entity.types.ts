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
} as const

export type BusinessStatus =
	(typeof BUSINESS_STATUS)[keyof typeof BUSINESS_STATUS]

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
	client: ClientInfo
	agent: AgentInfo
	product: ProductInfo
	currency: CurrencyInfo
	periodicity: PeriodicityInfo | null
	clientOrigin: ClientOriginInfo
}
