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

const TRM_STATE = {
  AUTO: 'auto',
  MANUAL: 'manual',
  ERROR: 'error',
} as const

export type TrmState = (typeof TRM_STATE)[keyof typeof TRM_STATE]

// ─── TRM display data ─────────────────────────────────────────────────────────

/** Data shape used by TrmDisplay and UsdKpiPanel for rendering */
export interface TrmDisplayData {
  rate: number
  source: TrmState
  fetchedAt?: string
}
