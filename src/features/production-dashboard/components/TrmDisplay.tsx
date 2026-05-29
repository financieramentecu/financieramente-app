'use client'

import { useState } from 'react'
import type { TrmState } from '../types/trm.types'

interface TrmDisplayProps {
  trmState: TrmState
  trmRate: number | null
  isLoading: boolean
  error: string
  onManualTrm: (rate: number) => void
  /** When true: renders auto/manual/loading inline; returns null for error state. */
  compact?: boolean
}

/** Format a TRM rate as "4,050 COP/USD" (period-as-thousands, no decimals for whole rates) */
function formatTrm(rate: number): string {
  const formatted = rate.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return `${formatted} COP/USD`
}

/**
 * Displays the current TRM rate (auto or manual) or the fallback input form.
 */
export function TrmDisplay({
  trmState,
  trmRate,
  isLoading,
  error,
  onManualTrm,
  compact = false,
}: TrmDisplayProps) {
  const [inputValue, setInputValue] = useState('')

  const parsedInput = parseFloat(inputValue)
  const isInputValid = !isNaN(parsedInput) && parsedInput > 0

  const handleRecalculate = () => {
    if (isInputValid) {
      onManualTrm(parsedInput)
    }
  }

  if (isLoading) {
    if (compact) {
      return <div className="h-6 w-36 animate-pulse rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} aria-label="Cargando TRM..." />
    }
    return (
      <div
        data-testid="trm-skeleton"
        className="h-5 w-40 animate-pulse rounded bg-muted"
        aria-label="Cargando TRM..."
      />
    )
  }

  if (trmState === 'error' && !isLoading) {
    // In compact mode, the error block is handled by the parent (shown outside the header)
    if (compact) return null
    return (
      <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-sm text-destructive">{error || 'No fue posible consultar la TRM automáticamente'}</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Ej: 4050"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-32 rounded border px-2 py-1 text-sm"
            aria-label="TRM manual"
          />
          <button
            type="button"
            disabled={!isInputValid}
            onClick={handleRecalculate}
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
          >
            Recalcular
          </button>
        </div>
      </div>
    )
  }

  if (trmState === 'manual' && trmRate !== null) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs ring-1 ring-amber-200">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
        <span className="font-semibold tabular-nums text-foreground">{formatTrm(trmRate)}</span>
        <span className="text-muted-foreground">TRM ingresada manualmente</span>
      </div>
    )
  }

  // trmState === 'auto'
  if (trmRate !== null) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)' }}
      >
        {/* Pulsing dot — indicates real-time value */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
        </span>
        <span className="font-semibold tabular-nums text-white">{formatTrm(trmRate)}</span>
        <span style={{ color: 'rgba(255,255,255,0.65)' }}>(TRM automático)</span>
      </div>
    )
  }

  return null
}
