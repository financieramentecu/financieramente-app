'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { BusinessSupportDTO } from '../types/business-support.types'
import { businessSupportsApi } from '../lib/business-supports-api'
import { validateUpload } from '../lib/mime-utils'

const IDLE: AsyncState<BusinessSupportDTO> = { status: 'idle', data: undefined, error: '' }

const MIME_ERROR_MESSAGES: Record<string, string> = {
  INVALID_MIME: 'Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, WebP, GIF).',
  FILE_TOO_LARGE: 'El archivo supera el tamaño máximo permitido (10 MB).',
}

interface UseUploadComprobanteReturn {
  state: AsyncState<BusinessSupportDTO>
  upload: (file: File) => Promise<void>
  reset: () => void
}

export function useUploadComprobante(businessId: number): UseUploadComprobanteReturn {
  const [state, setState] = useState<AsyncState<BusinessSupportDTO>>(IDLE)

  const upload = useCallback(async (file: File) => {
    setState({ status: 'loading', data: undefined, error: '' })

    const validation = validateUpload(file.type, file.size)
    if (!validation.ok) {
      setState({
        status: 'error',
        data: undefined,
        error: MIME_ERROR_MESSAGES[validation.code] ?? 'Archivo inválido',
      })
      return
    }

    try {
      const { url, key } = await businessSupportsApi.presign(businessId, file.type, file.size)

      const putRes = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      if (!putRes.ok) {
        throw new Error(`Error al subir archivo: ${putRes.status}`)
      }

      const comprobante = await businessSupportsApi.persist(businessId, {
        key,
        mime: file.type,
        size: file.size,
      })

      setState({ status: 'success', data: comprobante, error: '' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir comprobante'
      setState({ status: 'error', data: undefined, error: message })
    }
  }, [businessId])

  const reset = useCallback(() => setState(IDLE), [])

  return { state, upload, reset }
}
