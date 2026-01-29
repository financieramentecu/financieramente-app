import { useState, useEffect, useCallback } from 'react'

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

interface FileImportResponse {
    idFileImport: number
    nameFile: string
    loadDate: string
    totalRecord: number
    successRecord: number
    errorRecord: number
    sincronizadoRecord: number
    rezagadoRecord: number
    noSincronizadoRecord: number
    status: string
    createdAt: string
    user: {
        name: string
        lastName: string | null
    }
}

export function useFileHistory() {
    const [historial, setHistorial] = useState<CargaHistorial[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchHistorial = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/carga-archivos/file-import')

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Error al cargar el historial')
            }

            const contentType = response.headers.get('content-type')
            if (!contentType?.includes('application/json')) {
                const text = await response.text()
                throw new Error(text || 'Respuesta no-JSON recibida')
            }

            const text = await response.text()
            if (!text) {
                throw new Error('Respuesta vacía del servidor')
            }

            const data: FileImportResponse[] = JSON.parse(text)

            const formattedData: CargaHistorial[] = data.map((item) => {
                const date = new Date(item.createdAt)
                return {
                    id: item.idFileImport.toString(),
                    nombreArchivo: item.nameFile,
                    fechaCarga: date.toLocaleDateString(),
                    horaCarga: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    usuario: `${item.user.name} ${item.user.lastName || ''}`.trim(),
                    exitosos: item.successRecord,
                    errores: item.errorRecord,
                    sincronizados: item.sincronizadoRecord,
                    sinRegistro: item.noSincronizadoRecord,
                    rezagados: item.rezagadoRecord,
                    estado: item.status,
                    createdAt: item.createdAt
                }
            })

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
        deleteItem
    }
}
