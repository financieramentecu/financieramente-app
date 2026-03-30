import type {
	ProcessBatchRequest,
	ProcessBatchResponse,
	FileImportHistory,
	PaginatedData,
	FileImportRecordsResponse,
	FileImportRecordStatusFilter,
} from '../types/load-file.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { FileImport } from '@prisma/client'

/**
 * Servicio cliente para el módulo de carga de archivos (load-file).
 * Utiliza el contrato global de respuestas `ApiResponse`.
 */
export const loadFileApi = {
	/**
	 * Procesa un lote (batch) de registros Excel.
	 */
	processBatch: async (
		request: ProcessBatchRequest,
		config?: { signal?: AbortSignal }
	): Promise<ApiResponse<ProcessBatchResponse>> => {
		try {
			const res = await fetch('/api/carga-archivos/process-batch', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(request),
				signal: config?.signal,
			})

			const json = await res.json()

			// Check HTTP ok status and format into ApiResponse
			if (!res.ok) {
				return { data: null, error: json.error || 'Error procesando lote' }
			}

			// If backend successfully returned the wrapper structure
			if (json.data && 'summary' in json.data) {
				return { data: json.data as ProcessBatchResponse }
			}

			// If the backend returned legacy struct without wrapper, adapt it (Temporary during migration)
			if (json.success && json.summary) {
				return { data: { summary: json.summary } }
			}

			return { data: null, error: 'Formato de respuesta desconocido' }
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error ? error.message : 'Error inesperado servidor',
			}
		}
	},

	/**
	 * Obtiene el historial de cargas de archivo del usuario actual.
	 */
	getImportHistory: async (
		page: number,
		pageSize: number = 10,
		filters?: {
			month?: number
			year?: number
			statuses?: string[]
			search?: string
		},
		config?: { signal?: AbortSignal }
	): Promise<ApiResponse<PaginatedData<FileImportHistory>>> => {
		try {
			const params = new URLSearchParams()
			params.set('page', String(page))
			params.set('limit', String(pageSize))
			if (filters?.month != null) params.set('month', String(filters.month))
			if (filters?.year != null) params.set('year', String(filters.year))
			if (filters?.statuses && filters.statuses.length > 0)
				params.set('status', filters.statuses.join(','))
			if (filters?.search) params.set('search', filters.search)
			const url = `/api/carga-archivos/file-import?${params.toString()}`
			const res = await fetch(url, { method: 'GET', signal: config?.signal })

			const json = await res.json()

			if (!res.ok) {
				return { data: null, error: json.error || 'Error obteniendo historial' }
			}

			if (json.data && json.data.items) {
				return { data: json.data }
			}

			// Legacy adaption
			if (json.success && json.data) {
				return {
					data: {
						items: json.data,
						pagination: json.pagination,
					},
				}
			}

			return { data: null, error: 'Formato de respuesta desconocido' }
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error ? error.message : 'Error inesperado servidor',
			}
		}
	},

	/**
	 * Inicia un nuevo registro de importación antes de procesar lotes.
	 * El servidor genera el nombre del archivo a partir del fileType, month y year.
	 */
	initiateImport: async (
		fileType: string,
		month: number,
		year: number,
		config?: { signal?: AbortSignal }
	): Promise<ApiResponse<{ fileImport: FileImport }>> => {
		try {
			const res = await fetch('/api/carga-archivos/file-import', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ fileType, month, year }),
				signal: config?.signal,
			})

			const json = await res.json()

			// Check HTTP ok status and format into ApiResponse
			if (!res.ok) {
				return {
					data: null,
					error: json.error || 'Error iniciando importación',
				}
			}

			// If backend successfully returned the wrapper structure
			if (json.data && 'fileImport' in json.data) {
				return { data: json.data as { fileImport: FileImport } }
			}

			return { data: null, error: 'Formato de respuesta desconocido' }
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error ? error.message : 'Error inesperado servidor',
			}
		}
	},

	/**
	 * Obtiene el progreso de una importación individual.
	 */
	getImportProgress: async (
		fileImportId: number,
		config?: { signal?: AbortSignal }
	): Promise<ApiResponse<FileImport>> => {
		try {
			const res = await fetch(
				`/api/carga-archivos/file-import/${fileImportId}`,
				{
					method: 'GET',
					signal: config?.signal,
				}
			)

			const json = await res.json()

			// Check HTTP ok status and format into ApiResponse
			if (!res.ok) {
				return { data: null, error: json.error || 'Error obteniendo progreso' }
			}

			// If backend successfully returned the wrapper structure
			if (json.data) {
				return { data: json.data as FileImport }
			}

			return { data: null, error: 'Formato de respuesta desconocido' }
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error ? error.message : 'Error inesperado servidor',
			}
		}
	},

	/**
	 * Obtiene registros de una importación filtrados por estado (Sincronizados, No sincronizados, Rezagados), con paginación.
	 */
	getImportRecords: async (
		fileImportId: number,
		options: {
			page?: number
			pageSize?: number
			status?: FileImportRecordStatusFilter
		} = {},
		config?: { signal?: AbortSignal }
	): Promise<ApiResponse<FileImportRecordsResponse>> => {
		try {
			const params = new URLSearchParams()
			if (options.page != null) params.set('page', String(options.page))
			if (options.pageSize != null)
				params.set('pageSize', String(options.pageSize))
			if (options.status) params.set('status', options.status)
			const query = params.toString()
			const url = `/api/carga-archivos/${fileImportId}/records${query ? `?${query}` : ''}`
			const res = await fetch(url, { method: 'GET', signal: config?.signal })
			const json = await res.json()
			if (!res.ok) {
				return {
					data: null,
					error: json.error || 'Error obteniendo registros',
				}
			}
			if (json.data && Array.isArray(json.data.items)) {
				return { data: json.data as FileImportRecordsResponse }
			}
			return { data: null, error: 'Formato de respuesta desconocido' }
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error ? error.message : 'Error inesperado servidor',
			}
		}
	},

	/**
	 * Invoca el proceso de pre-liquidación para un archivo específico.
	 * Llama a POST /api/pre-liquidacion/procesar con el fileImportId y el mes (YYYY-MM).
	 */
	preliquidar: async (
		fileImportId: number,
		mes: string,
		config?: { signal?: AbortSignal }
	): Promise<
		ApiResponse<{ success: boolean; registrosProcesados: number; mensaje: string }>
	> => {
		try {
			const res = await fetch('/api/pre-liquidacion/procesar', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ fileImportId, mes }),
				signal: config?.signal,
			})

			const json = await res.json()

			if (!res.ok) {
				return {
					data: null,
					error: json.error || 'Error al procesar pre-liquidación',
				}
			}

			if (
				json.data &&
				typeof json.data.success === 'boolean' &&
				typeof json.data.registrosProcesados === 'number'
			) {
				return { data: json.data }
			}

			// Legacy: backend returned success/registrosProcesados at root level
			if (typeof json.success === 'boolean') {
				return {
					data: {
						success: json.success,
						registrosProcesados: json.registrosProcesados ?? 0,
						mensaje: json.mensaje ?? '',
					},
				}
			}

			return { data: null, error: 'Formato de respuesta desconocido' }
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error ? error.message : 'Error inesperado servidor',
			}
		}
	},

	/**
	 * Obtiene los errores (FileImportError) de una importación.
	 */
	getImportErrors: async (
		fileImportId: number,
		config?: { signal?: AbortSignal }
	): Promise<
		ApiResponse<{ rowNumber: number; contract: string | null; reason: string; rawData: unknown }[]>
	> => {
		try {
			const res = await fetch(
				`/api/carga-archivos/${fileImportId}/errors`,
				{ method: 'GET', signal: config?.signal }
			)
			const json = await res.json()
			if (!res.ok) {
				return {
					data: null,
					error: json.error || 'Error obteniendo errores',
				}
			}
			if (Array.isArray(json.data)) {
				return { data: json.data }
			}
			return { data: null, error: 'Formato de respuesta desconocido' }
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error ? error.message : 'Error inesperado servidor',
			}
		}
	},
}
