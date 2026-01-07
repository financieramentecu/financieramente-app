import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	Empresa,
	EmpresaFilters,
	CreateEmpresaInput,
	UpdateEmpresaInput,
	EmpresaListResponse,
} from '../types/empresa.types'

/**
 * Cliente API para empresas/agencias
 * Retorna ApiResponse<T> según el estándar del proyecto
 */
export const empresaApi = {
	/**
	 * Obtiene la lista de empresas con paginación y búsqueda
	 */
	async getEmpresas(
		params?: EmpresaFilters & { page?: number; pageSize?: number }
	): Promise<ApiResponse<EmpresaListResponse>> {
		try {
			const queryParams = new URLSearchParams()
			if (params?.search) queryParams.set('search', params.search)
			if (params?.status) queryParams.set('status', params.status)
			if (params?.page) queryParams.set('page', params.page.toString())
			if (params?.pageSize)
				queryParams.set('pageSize', params.pageSize.toString())

			const queryString = queryParams.toString()
			const response = await fetch(
				`/api/empresas${queryString ? `?${queryString}` : ''}`,
				{
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const data: ApiResponse<EmpresaListResponse> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in data ? data.error : 'Error al obtener empresas',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener empresas',
			}
		}
	},

	/**
	 * Obtiene una empresa por ID
	 */
	async getEmpresa(id: number): Promise<ApiResponse<Empresa>> {
		try {
			const response = await fetch(`/api/empresas/${id}`, {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const data: ApiResponse<Empresa> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in data ? data.error : 'Error al obtener empresa',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener empresa',
			}
		}
	},

	/**
	 * Crea una nueva empresa
	 */
	async createEmpresa(
		data: CreateEmpresaInput
	): Promise<ApiResponse<Empresa>> {
		try {
			const response = await fetch('/api/empresas', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
				credentials: 'include',
			})

			const result: ApiResponse<Empresa> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in result ? result.error : 'Error al crear empresa',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear empresa',
			}
		}
	},

	/**
	 * Actualiza una empresa existente
	 */
	async updateEmpresa(
		id: number,
		data: UpdateEmpresaInput
	): Promise<ApiResponse<Empresa>> {
		try {
			const response = await fetch(`/api/empresas/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
				credentials: 'include',
			})

			const result: ApiResponse<Empresa> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in result ? result.error : 'Error al actualizar empresa',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al actualizar empresa',
			}
		}
	},

	/**
	 * Elimina una empresa
	 */
	async deleteEmpresa(id: number): Promise<ApiResponse<void>> {
		try {
			const response = await fetch(`/api/empresas/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			})

			const result: ApiResponse<void> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in result ? result.error : 'Error al eliminar empresa',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar empresa',
			}
		}
	},
}

