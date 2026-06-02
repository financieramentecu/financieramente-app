'use client'

import { useState, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { TrmDisplayData, TrmState } from '../types/trm.types'
import type { TrmApiData } from '@/app/api/trm/route'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

interface UseTrmResult {
  /** Whether TRM is currently being fetched */
  isLoading: boolean
  /** The effective TRM rate (auto or manual); null when unavailable */
  trmRate: number | null
  /** Source: 'auto' | 'manual' | 'error' */
  trmState: TrmState
  /** True when user has entered a manual TRM */
  isManual: boolean
  /** Error message when auto-fetch failed */
  error: string
  /** Set a manual TRM rate; triggers recomputation in consuming components */
  setManualTrm: (rate: number) => void
}

/**
 * Fetches the current TRM from the BFF proxy on mount (once).
 * On failure, exposes setManualTrm for the fallback UI.
 * Does NOT re-fetch on filter/hierarchy changes (per spec CAP-4).
 */
export function useTrm(): UseTrmResult {
  const [asyncState, setAsyncState] = useState<AsyncState<TrmDisplayData>>({
    status: 'loading',
    data: undefined,
    error: '',
  })
  const [manualRate, setManualRate] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchTrm() {
      setAsyncState({ status: 'loading', data: undefined, error: '' })
      try {
        const response = await fetch('/api/trm', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })

        if (cancelled) return

        if (!response.ok) {
          setAsyncState({
            status: 'error',
            data: undefined,
            error: 'No fue posible consultar la TRM automáticamente',
          })
          return
        }

        const body = (await response.json()) as ApiResponse<TrmApiData>

        if (cancelled) return

        if ('error' in body || body.data === null) {
          setAsyncState({
            status: 'error',
            data: undefined,
            error: 'No fue posible consultar la TRM automáticamente',
          })
          return
        }

        setAsyncState({
          status: 'success',
          data: { rate: body.data.valor, source: 'auto', fetchedAt: body.data.fetchedAt },
          error: '',
        })
      } catch {
        if (!cancelled) {
          setAsyncState({
            status: 'error',
            data: undefined,
            error: 'No fue posible consultar la TRM automáticamente',
          })
        }
      }
    }

    fetchTrm()
    return () => {
      cancelled = true
    }
  }, []) // Only on mount — per CAP-4

  const setManualTrm = (rate: number) => {
    setManualRate(rate)
  }

  const isLoading = asyncState.status === 'loading'
  const isError = asyncState.status === 'error'
  const isManual = manualRate !== null

  let trmRate: number | null = null
  let trmState: TrmState = 'error'
  let error = ''

  if (isManual) {
    trmRate = manualRate
    trmState = 'manual'
  } else if (asyncState.status === 'success') {
    trmRate = asyncState.data.rate
    trmState = 'auto'
  } else if (isError) {
    trmRate = null
    trmState = 'error'
    error = asyncState.error
  }

  return { isLoading, trmRate, trmState, isManual, error, setManualTrm }
}
