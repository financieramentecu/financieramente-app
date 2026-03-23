import { useState, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { loadFileApi } from '../lib/load-file-api'

export interface CargaHistorial {
	id: string
	nombreArchivo: string
	fechaCarga: string
	horaCarga: string
	usuario: string
	exitosos: number
	errores: number
	sincronizados: number
	sinRegistro: number
	rezagados: number
	estado: string
	createdAt: string // Raw ISO string for filtering
	fileType: 'POLIZA' | 'VOLUNTARIA' | string
	idFileImport: number
}

interface FileHistoryParams {
	month?: number
	year?: number
	status?: string
	search?: string
}

export function useFileHistory(params: FileHistoryParams = {}) {
	const [state, setState] = useState<AsyncState<CargaHistorial[]>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const fetchHistorial = async () => {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const response = await loadFileApi.getImportHistory(1, 100, params)

			if ('error' in response && response.error) {
				throw new Error(response.error)
			}

			if (!response.data || !response.data.items) {
				setState({ status: 'success', data: [], error: '' })
				return
			}

			const formattedData: CargaHistorial[] = response.data.items.map(
				(item) => {
					const date = new Date(item.createdAt)
					return {
						id: item.idFileImport.toString(),
						nombreArchivo: item.nameFile,
						fechaCarga: date.toLocaleDateString(),
						horaCarga: date.toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
						}),
						usuario: `${item.user.name} ${item.user.lastName || ''}`.trim(),
						exitosos: item.successRecord,
						errores: item.errorRecord,
						sincronizados: item.sincronizadoRecord,
						sinRegistro: item.noSincronizadoRecord,
						rezagados: item.rezagadoRecord,
						estado: item.status,
						createdAt:
							item.createdAt instanceof Date
								? item.createdAt.toISOString()
								: String(item.createdAt),
						fileType: item.fileType,
						idFileImport: item.idFileImport,
					}
				}
			)

			setState({ status: 'success', data: formattedData, error: '' })
		} catch (err) {
			console.error('Error fetching history:', err)
			setState({
				status: 'error',
				data: undefined,
				error: err instanceof Error ? err.message : 'Error desconocido',
			})
		}
	}

	const deleteItem = async (id: string) => {
		try {
			const response = await fetch(`/api/carga-archivos/file-import/${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.error || 'Error al eliminar el registro')
			}

			// Actualizar estado local eliminando el item
			setState((prev) => {
				if (prev.status === 'success') {
					return {
						...prev,
						data: prev.data.filter((item) => item.id !== id),
					}
				}
				return prev
			})
			return true
		} catch (err) {
			console.error('Error deleting item:', err)
			setState((prev) => {
				if (prev.status === 'success' || prev.status === 'idle') {
					return {
						status: 'error',
						data: undefined,
						error:
							err instanceof Error ? err.message : 'Error desconocido',
					}
				}
				return {
					status: 'error',
					data: undefined,
					error: err instanceof Error ? err.message : 'Error desconocido',
				}
			})
			return false
		}
	}

	useEffect(() => {
		fetchHistorial()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.month, params.year, params.status, params.search])

	return {
		historial: state.status === 'success' ? state.data : [],
		isLoading: state.status === 'loading',
		error: state.status === 'error' ? state.error : null,
		refetch: fetchHistorial,
		deleteItem,
	}
}
