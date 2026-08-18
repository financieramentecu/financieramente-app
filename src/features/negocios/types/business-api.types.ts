/**
 * Tipos para requests y responses de la API de negocios
 */

import type {
	BusinessEntity,
	BusinessStatus,
	NovedadFilterValue,
} from './business-entity.types'

// ============================================
// PAGINACIÓN
// ============================================

/**
 * Metadatos de paginación
 */
export interface PaginationMeta {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

/**
 * Parámetros de búsqueda para lista de negocios
 * Búsqueda unificada por identityNumber, nombres, apellidos, email del cliente,
 * ID del negocio y número de contrato
 */
export interface BusinessListParams {
	page?: number
	pageSize?: number
	search?: string
	/** Back-compat single status filter */
	status?: BusinessStatus
	/** Multiselect statuses — takes precedence over `status` when provided */
	statuses?: BusinessStatus[]
	/** YYYY-MM-DD; debe ir junto con `dateTo` (filtro por `date_anchored` negocio, Bogotá) */
	dateFrom?: string
	/** YYYY-MM-DD */
	dateTo?: string
	/** YYYY-MM-DD; filtra por createdAt del negocio */
	createdFrom?: string
	/** YYYY-MM-DD; filtra por createdAt del negocio */
	createdTo?: string
	/** YYYY-MM-DD; filtra por dateIssued (fecha de emisión, columna nullable) */
	dateIssuedFrom?: string
	/** YYYY-MM-DD */
	dateIssuedTo?: string
	/** Filtro por nombre del Money Strategist (agente) */
	agentName?: string
	/** Campo por el que ordenar: 'agentName' | 'createdAt' | etc. */
	sortBy?: string
	/** Dirección del orden: 'asc' | 'desc' */
	sortOrder?: 'asc' | 'desc'
	/** Filter by whether the business has active support records */
	hasSupports?: boolean
	/** Filtros Avanzados — catálogos */
	companyIds?: number[]
	productIds?: number[]
	originIds?: number[]
	/** Plazo en años (distinct values from Business.term) */
	terms?: number[]
	/** IDs de periodicidad de compra */
	periodicityIds?: number[]
	/** IDs de categoría del Money Strategist */
	agentCategoryIds?: number[]
	/** IDs de Money Strategist (User.idUser) */
	agentIds?: number[]
	/**
	 * Estados de novedad (multiselect). Incluye SIN_NOVEDAD.
	 * Vacío/undefined = Todos (sin criterio de novedad).
	 */
	novedadStatuses?: NovedadFilterValue[]
}

/** Body POST `/api/negocios/export` — mirrors all filter params from BusinessListParams */
export interface NegociosExportBody {
	search?: string
	status?: BusinessStatus
	statuses?: BusinessStatus[]
	/** Con `dateTo`, filtra por `date_anchored` (Bogotá). Sin fechas = sin filtro de rango. */
	dateFrom?: string
	dateTo?: string
	createdFrom?: string
	createdTo?: string
	dateIssuedFrom?: string
	dateIssuedTo?: string
	agentName?: string
	hasSupports?: boolean
	companyIds?: number[]
	productIds?: number[]
	originIds?: number[]
	terms?: number[]
	periodicityIds?: number[]
	agentCategoryIds?: number[]
	agentIds?: number[]
	novedadStatuses?: NovedadFilterValue[]
}

// ============================================
// RESPONSES
// ============================================

/**
 * Respuesta de lista de negocios
 */
export interface BusinessListResponse {
	businesses: BusinessEntity[]
	pagination: PaginationMeta
}

/**
 * Respuesta de validación de contrato
 */
export interface ContractValidationResponse {
	available: boolean
	existingBusinessId?: number
}

// ============================================
// REQUESTS
// ============================================

/**
 * Request para actualizar un negocio
 */
export interface UpdateBusinessRequest {
	contract?: string
	idClientOrigin?: number
	idSettlementCommission?: number
	idProduct?: number
	term?: number
	value?: number
	idBuyPeriodicity?: number
	idCurrency?: number
	idUser?: number
	numAportes?: number
	dateIssued?: string
}

/**
 * Request para cancelar un negocio
 */
export interface CancelBusinessRequest {
	reason: string // 20-500 caracteres
}

/** Estado de cuota de pago para modal (API payments) */
export type AnnualInstallmentStatusUi =
	| 'SIN_FONDEAR'
	| 'FONDEADO'
	| 'EN_CARTERA'
	| 'PAGO_ANTICIPADO'
	| 'CARTERA_PAGADO'

/** @deprecated Use PaymentInstallmentDto */
export type AnnualInstallmentDto = PaymentInstallmentDto

export interface PaymentInstallmentDto {
	installmentIndex: number
	status: AnnualInstallmentStatusUi
	dateAnchored: string | null
	expectedDate: string | null
	portfolioDate: string | null
	earlyPaymentDate: string | null
	portfolioPaymentDate: string | null
}

export interface AnnualPaymentsResponse {
	businessId: number
	status: BusinessStatus
	installments: PaymentInstallmentDto[]
}

export interface FondearAnualidadesRequest {
	fundedInstallmentIndexes: number[]
}

// ============================================
// ESTADÍSTICAS
// ============================================

/**
 * KPI data containing item count and grouped values
 */
export interface KpiCardData {
	count: number
	totalCop: number
	totalUsd: number
}

/**
 * Respuesta de estadísticas de negocios planas para el Coach
 */
export interface CoachKpiResponse {
	ventasEfectuadas: KpiCardData
	emitidos: KpiCardData & { sinSoporte: number }
	fondeados: KpiCardData
}

