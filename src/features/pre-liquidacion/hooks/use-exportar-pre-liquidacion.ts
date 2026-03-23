'use client'

import { useState, useCallback } from 'react'

/**
 * Hook para exportar resultados de pre-liquidación a Excel
 */
export function useExportarPreLiquidacion() {
    const [isExportando, setIsExportando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const exportar = useCallback(async (fileId: number) => {
        setIsExportando(true)
        setError(null)

        try {
            const response = await fetch(`/api/pre-liquidacion/exportar/${fileId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                const contentType = response.headers.get('content-type')
                const errorData = contentType?.includes('application/json')
                    ? await response.json().catch(() => ({ error: `Error ${response.status}` }))
                    : { error: `Error ${response.status}: ${response.statusText}` }
                setError(errorData.error || 'Error al exportar')
                return
            }

            // Obtener el blob del archivo
            const blob = await response.blob()

            // Crear URL temporal y descargar
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `preliquidacion_${new Date().toISOString().split('T')[0]}.xlsx`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            console.error('Error al exportar:', err)
            setError(err instanceof Error ? err.message : 'Error desconocido')
        } finally {
            setIsExportando(false)
        }
    }, [])

    return {
        exportar,
        isExportando,
        error,
    }
}
