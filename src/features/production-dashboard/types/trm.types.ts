/**
 * Types for TRM (Tasa Representativa del Mercado) auto-fetch and manual fallback.
 */

// ─── External API response ────────────────────────────────────────────────────

/** Shape returned by co.dolarapi.com/v1/trm */
export interface TrmResponse {
  valor: number
  nombre: string
  unidad: string
  fechaActualizacion: string
}

// ─── TRM source state ─────────────────────────────────────────────────────────

export type TrmState = 'auto' | 'manual' | 'error'

// ─── TRM display data ─────────────────────────────────────────────────────────

/** Data shape used by TrmDisplay and UsdKpiPanel for rendering */
export interface TrmDisplayData {
  rate: number
  source: TrmState
  fetchedAt?: string
}
