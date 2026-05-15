'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { BusinessSupportDTO } from '../types/business-support.types'
import { businessSupportsApi } from '../lib/business-supports-api'

interface UseBusinessSupportsReturn {
  state: AsyncState<BusinessSupportDTO[]>
  refetch: () => Promise<void>
}

export function useBusinessSupports(businessId: number): UseBusinessSupportsReturn {
  const [state, setState] = useState<AsyncState<BusinessSupportDTO[]>>({
    status: 'loading',
    data: undefined,
    error: '',
  })

  const fetch = useCallback(async () => {
    setState({ status: 'loading', data: undefined, error: '' })
    try {
      const comprobantes = await businessSupportsApi.list(businessId)
      setState({ status: 'success', data: comprobantes, error: '' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar comprobantes'
      setState({ status: 'error', data: undefined, error: message })
    }
  }, [businessId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { state, refetch: fetch }
}
