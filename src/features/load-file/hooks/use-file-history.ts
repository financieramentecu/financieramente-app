import { useState, useEffect, useCallback } from 'react'
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
}

export function useFileHistory() {
	const [historial, setHistorial] = useState<CargaHistorial[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchHistorial = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const response = await loadFileApi.getImportHistory(1, 100) // Default to fetching recent 100 items if no pagination built in, or adjust as needed. Currently the existing code didn't paginate but just fetched all.

			if ('error' in response) {
				throw new Error(response.error)
			}

			if (!response.data || !response.data.items) {
				setHistorial([])
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
					}
				}
			)

			setHistorial(formattedData)
		} catch (err) {
			console.error('Error fetching history:', err)
			setError(err instanceof Error ? err.message : 'Error desconocido')
		} finally {
			setIsLoading(false)
		}
	}, [])

	const deleteItem = useCallback(async (id: string) => {
		try {
			const response = await fetch(`/api/carga-archivos/file-import/${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.error || 'Error al eliminar el registro')
			}

			// Actualizar estado local eliminando el item
			setHistorial((prev) => prev.filter((item) => item.id !== id))
			return true
		} catch (err) {
			console.error('Error deleting item:', err)
			setError(err instanceof Error ? err.message : 'Error desconocido')
			return false
		}
	}, [])

	useEffect(() => {
		fetchHistorial()
	}, [fetchHistorial])

	return {
		historial,
		isLoading,
		error,
		refetch: fetchHistorial,
		deleteItem,
	}
}
