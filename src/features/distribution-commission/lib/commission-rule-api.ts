import { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	CommissionRule,
	CommissionRuleListResponse,
	CreateCommissionRuleInput,
	UpdateCommissionRuleInput,
	AssignNewBusinessesResponse,
} from '../types/commission-rule.types'

/**
 * Filter parameters for fetching commission rules
 */
export interface CommissionRuleFilters {
	search?: string
	active?: string // 'true' | 'false' | 'all'
}

/**
 * API client for commission rules
 * Returns ApiResponse<T> following project standards
 */
export const commissionRuleApi = {
	/**
	 * Gets the list of commission rules for a product configuration
	 */
	async getCommissionRules(
		productConfigId: number,
		params?: CommissionRuleFilters & {
			page?: number
			pageSize?: number
		}
	): Promise<ApiResponse<CommissionRuleListResponse>> {
		try {
			const queryParams = new URLSearchParams()
			if (params?.search) queryParams.set('search', params.search)
			if (params?.active) queryParams.set('active', params.active)
			if (params?.page) queryParams.set('page', params.page.toString())
			if (params?.pageSize)
				queryParams.set('pageSize', params.pageSize.toString())

			const queryString = queryParams.toString()
			const response = await fetch(
				`/api/product-configurations/${productConfigId}/distribution-commission${
					queryString ? `?${queryString}` : ''
				}`,
				{
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const data: ApiResponse<CommissionRuleListResponse> =
				await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in data
							? data.error
							: 'Error al obtener reglas de comisión',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener reglas de comisión',
			}
		}
	},

	/**
	 * Gets a commission rule by ID
	 */
	async getCommissionRule(
		productConfigId: number,
		ruleId: number
	): Promise<ApiResponse<CommissionRule>> {
		try {
			const response = await fetch(
				`/api/product-configurations/${productConfigId}/distribution-commission/${ruleId}`,
				{
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const data: ApiResponse<CommissionRule> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in data
							? data.error
							: 'Error al obtener regla de comisión',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener regla de comisión',
			}
		}
	},

	/**
	 * Creates a new commission rule
	 */
	async createCommissionRule(
		productConfigId: number,
		data: Omit<CreateCommissionRuleInput, 'idProductConfiguration'>
	): Promise<ApiResponse<CommissionRule>> {
		try {
			const payload: CreateCommissionRuleInput = {
				...data,
				idProductConfiguration: productConfigId,
			}

			const response = await fetch(
				`/api/product-configurations/${productConfigId}/distribution-commission`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				}
			)

			const result: ApiResponse<CommissionRule> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in result
							? result.error
							: 'Error al crear regla de comisión',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear regla de comisión',
			}
		}
	},

	/**
	 * Updates an existing commission rule
	 */
	async updateCommissionRule(
		productConfigId: number,
		ruleId: number,
		data: Omit<
			UpdateCommissionRuleInput,
			'idProductPercentageCommission'
		>
	): Promise<ApiResponse<CommissionRule>> {
		try {
			const payload: UpdateCommissionRuleInput = {
				...data,
				idProductPercentageCommission: ruleId,
			}

			const response = await fetch(
				`/api/product-configurations/${productConfigId}/distribution-commission/${ruleId}`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				}
			)

			const result: ApiResponse<CommissionRule> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in result
							? result.error
							: 'Error al actualizar regla de comisión',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al actualizar regla de comisión',
			}
		}
	},

	/**
	 * Toggles the active status of a commission rule
	 */
	async toggleActive(
		productConfigId: number,
		ruleId: number,
		active: boolean
	): Promise<ApiResponse<CommissionRule>> {
		try {
			const response = await fetch(
				`/api/product-configurations/${productConfigId}/distribution-commission/${ruleId}`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ active }),
				}
			)

			const result: ApiResponse<CommissionRule> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in result
							? result.error
							: 'Error al activar/desactivar regla de comisión',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al activar/desactivar regla de comisión',
			}
		}
	},

	/**
	 * Assigns a rule as default for new businesses
	 */
	async assignNewBusinessesRule(
		productConfigId: number,
		ruleId: number
	): Promise<ApiResponse<AssignNewBusinessesResponse>> {
		try {
			const response = await fetch(
				`/api/product-configurations/${productConfigId}/distribution-commission/${ruleId}/assign-new-businesses`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const result: ApiResponse<AssignNewBusinessesResponse> =
				await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in result
							? result.error
							: 'Error al asignar regla predeterminada',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al asignar regla predeterminada',
			}
		}
	},
}
