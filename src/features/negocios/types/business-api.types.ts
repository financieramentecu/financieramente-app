/**
 * Tipos para requests y responses de la API de negocios
 */

import type { BusinessEntity, BusinessStatus } from './business-entity.types'

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
	status?: BusinessStatus
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
}

/**
 * Request para cancelar un negocio
 */
export interface CancelBusinessRequest {
	reason: string // 20-500 caracteres
}

// ============================================
// ESTADÍSTICAS
// ============================================

/**
 * Datos mensuales para gráficos
 */
export interface MonthlyData {
	month: string // "2024-01", "2024-02"
	totalValue: number
}

/**
 * Estadísticas por estado
 */
export interface StatusStats {
	totalValue: number
	totalMonth: number
	totalLastMonth: number
	monthlyData: MonthlyData[]
	growthPercentage: number
}

/**
 * Información de currency para estadísticas
 */
export interface StatsCurrencyInfo {
	symbol: string
	name: string
}

/**
 * Estadísticas agrupadas por currency
 * Record con symbol de currency como key (ej: "COP", "USD")
 */
export type StatsByCurrency = Record<string, StatusStats>

/**
 * Respuesta de estadísticas de negocios agrupadas por currency
 */
export interface BusinessStatsResponse {
	currencies: StatsCurrencyInfo[]
	efectuados: StatsByCurrency
	emitidos: StatsByCurrency
	clawbackBalance?: number
}
