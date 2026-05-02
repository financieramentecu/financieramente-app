/**
 * Servicio cliente para interactuar con la API de negocios
 * Centraliza todas las llamadas a la API de negocios
 */

import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessEntity } from '../types/business-entity.types'
import type {
	AnnualPaymentsResponse,
	CoachKpiResponse,
	BusinessListResponse,
	ContractValidationResponse,
	UpdateBusinessRequest,
	CancelBusinessRequest,
	BusinessListParams,
	FondearAnualidadesRequest,
	NegociosExportBody,
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
			const response = await fetch(`${BASE_URL}${queryString}`, {
				cache: 'no-store',
			})

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

	async getAnnualPayments(
		id: number
	): Promise<ApiResponse<AnnualPaymentsResponse>> {
		try {
			const response = await fetch(`${BASE_URL}/${id}/payments`)
			return await response.json()
		} catch (error) {
			console.error('Error al obtener aportes:', error)
			return { data: null, error: 'Error al obtener los aportes' }
		}
	},

	async fondearAnualidades(
		id: number,
		body: FondearAnualidadesRequest
	): Promise<ApiResponse<BusinessEntity>> {
		try {
			const response = await fetch(
				`${BASE_URL}/${id}/fondear-aportes`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				}
			)
			return await response.json()
		} catch (error) {
			console.error('Error al fondear aportes:', error)
			return { data: null, error: 'Error al fondear los aportes' }
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
	 * @param params - Parámetros de filtrado por fecha
	 * @returns Estadísticas de negocios planas (CoachKpiResponse)
	 */
	async getStats(params: {
		dateFrom?: string
		dateTo?: string
	} = {}): Promise<ApiResponse<CoachKpiResponse>> {
		try {
			const queryString = buildQueryString(params)
			const response = await fetch(`${BASE_URL}/stats${queryString}`, {
				cache: 'no-store',
			})

			return await response.json()
		} catch (error) {
			console.error('Error al obtener estadísticas:', error)
			return { data: null, error: 'Error al obtener estadísticas' }
		}
	},

	/**
	 * Exporta negocios a Excel (roles operación / admin / analista).
	 */
	async exportReport(body: NegociosExportBody): Promise<
		{ ok: true } | { ok: false; error: string }
	> {
		try {
			const response = await fetch(`${BASE_URL}/export`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})

			if (!response.ok) {
				const contentType = response.headers.get('content-type')
				const errPayload =
					contentType?.includes('application/json')
						? await response.json().catch(() => ({
								error: `Error ${response.status}`,
							}))
						: { error: `Error ${response.status}` }
				const msg =
					typeof errPayload === 'object' &&
					errPayload !== null &&
					'error' in errPayload &&
					typeof (errPayload as { error: unknown }).error === 'string'
						? (errPayload as { error: string }).error
						: 'Error al exportar'
				return { ok: false, error: msg }
			}

			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			const cd = response.headers.get('Content-Disposition')
			const match = cd?.match(/filename="([^"]+)"/)
			a.download = match?.[1] ?? `negocios_${new Date().toISOString().split('T')[0]}.xlsx`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)
			return { ok: true }
		} catch (error) {
			console.error('Error al exportar negocios:', error)
			return {
				ok: false,
				error:
					error instanceof Error ? error.message : 'Error al exportar negocios',
			}
		}
	},
}
