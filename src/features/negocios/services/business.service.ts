/**
 * Servicio cliente para interactuar con la API de negocios
 * Centraliza todas las llamadas a la API de negocios
 */

import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessEntity } from '../types/business-entity.types'
import type {
	BusinessListResponse,
	BusinessStatsResponse,
	ContractValidationResponse,
	UpdateBusinessRequest,
	CancelBusinessRequest,
	BusinessListParams,
} from '../types/business-api.types'

/**
 * Base URL para las APIs de negocios
 */
const BASE_URL = '/api/negocios'

/**
 * Construye query string a partir de parámetros
 */
function buildQueryString(params: Record<string, unknown>): string {
	const searchParams = new URLSearchParams()

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			searchParams.append(key, String(value))
		}
	})

	const queryString = searchParams.toString()
	return queryString ? `?${queryString}` : ''
}

/**
 * Servicio de negocios
 */
export const businessService = {
	/**
	 * Lista negocios con paginación y filtros
	 *
	 * @param params - Parámetros de búsqueda y paginación
	 * @returns Lista de negocios con metadatos de paginación
	 */
	async getAll(
		params: BusinessListParams = {}
	): Promise<ApiResponse<BusinessListResponse>> {
		try {
			const queryString = buildQueryString(params as Record<string, unknown>)
			const response = await fetch(`${BASE_URL}${queryString}`)

			return await response.json()
		} catch (error) {
			console.error('Error al obtener negocios:', error)
			return { data: null, error: 'Error al obtener negocios' }
		}
	},

	/**
	 * Obtiene un negocio por ID
	 *
	 * @param id - ID del negocio
	 * @returns Detalle del negocio
	 */
	async getById(id: number): Promise<ApiResponse<BusinessEntity>> {
		try {
			const response = await fetch(`${BASE_URL}/${id}`)

			return await response.json()
		} catch (error) {
			console.error('Error al obtener negocio:', error)
			return { data: null, error: 'Error al obtener el negocio' }
		}
	},

	/**
	 * Actualiza un negocio (principalmente el contrato)
	 *
	 * @param id - ID del negocio
	 * @param data - Datos a actualizar
	 * @returns Negocio actualizado
	 */
	async update(
		id: number,
		data: UpdateBusinessRequest
	): Promise<ApiResponse<BusinessEntity>> {
		try {
			const response = await fetch(`${BASE_URL}/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			})

			return await response.json()
		} catch (error) {
			console.error('Error al actualizar negocio:', error)
			return { data: null, error: 'Error al actualizar el negocio' }
		}
	},

	/**
	 * Cancela un negocio
	 *
	 * @param id - ID del negocio
	 * @param data - Motivo de cancelación
	 * @returns Negocio cancelado
	 */
	async cancel(
		id: number,
		data: CancelBusinessRequest
	): Promise<ApiResponse<BusinessEntity>> {
		try {
			const response = await fetch(`${BASE_URL}/${id}/cancel`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			})

			return await response.json()
		} catch (error) {
			console.error('Error al cancelar negocio:', error)
			return { data: null, error: 'Error al cancelar el negocio' }
		}
	},

	/**
	 * Fondea un negocio (transición EMITIDO → FONDEADO)
	 *
	 * @param id - ID del negocio
	 * @returns Negocio fondeado
	 */
	async fondear(id: number): Promise<ApiResponse<BusinessEntity>> {
		try {
			const response = await fetch(`${BASE_URL}/${id}/fondear`, {
				method: 'POST',
			})

			return await response.json()
		} catch (error) {
			console.error('Error al fondear negocio:', error)
			return { data: null, error: 'Error al fondear el negocio' }
		}
	},

	/**
	 * Valida si un número de contrato está disponible
	 *
	 * @param contract - Número de contrato a validar
	 * @param excludeBusinessId - ID de negocio a excluir (para edición)
	 * @returns Estado de disponibilidad
	 */
	async validateContract(
		contract: string,
		excludeBusinessId?: number
	): Promise<ApiResponse<ContractValidationResponse>> {
		try {
			const params: Record<string, unknown> = { contract }
			if (excludeBusinessId) {
				params.excludeBusinessId = excludeBusinessId
			}

			const queryString = buildQueryString(params)
			const response = await fetch(
				`${BASE_URL}/validate-contract${queryString}`
			)

			return await response.json()
		} catch (error) {
			console.error('Error al validar contrato:', error)
			return { data: null, error: 'Error al validar el contrato' }
		}
	},

	/**
	 * Obtiene estadísticas de negocios
	 *
	 * @returns Estadísticas de negocios efectuados y emitidos
	 */
	async getStats(): Promise<ApiResponse<BusinessStatsResponse>> {
		try {
			const response = await fetch(`${BASE_URL}/stats`)

			return await response.json()
		} catch (error) {
			console.error('Error al obtener estadísticas:', error)
			return { data: null, error: 'Error al obtener estadísticas' }
		}
	},
}
