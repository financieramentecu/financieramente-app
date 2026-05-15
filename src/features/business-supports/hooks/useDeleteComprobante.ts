'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { businessSupportsApi } from '../lib/business-supports-api'

/** Success payload: just the deleted supportId for reference */
type DeleteResult = { supportId: string }

const IDLE: AsyncState<DeleteResult> = { status: 'idle', data: undefined, error: '' }

interface UseDeleteComprobanteReturn {
  state: AsyncState<DeleteResult>
  remove: (supportId: string) => Promise<void>
  reset: () => void
}

export function useDeleteComprobante(businessId: number): UseDeleteComprobanteReturn {
  const [state, setState] = useState<AsyncState<DeleteResult>>(IDLE)

  const remove = useCallback(async (supportId: string) => {
    setState({ status: 'loading', data: undefined, error: '' })
    try {
      await businessSupportsApi.remove(businessId, supportId)
      setState({ status: 'success', data: { supportId }, error: '' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar comprobante'
      setState({ status: 'error', data: undefined, error: message })
    }
  }, [businessId])

  const reset = useCallback(() => setState(IDLE), [])

  return { state, remove, reset }
}
