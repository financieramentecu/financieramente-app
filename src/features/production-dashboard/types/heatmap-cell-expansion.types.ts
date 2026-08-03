/**
 * Types for the heatmap cell business accordion (client-only expansion layer).
 * All identifiers in English; user-facing strings are in Spanish in the UI layer.
 */

import type { BusinessStatus } from '@/features/negocios/types/business-entity.types'

/** Composite key identifying one expandable heatmap cell: `${idUser}:${idCompany}`. */
export type CellExpansionKey = `${number}:${number}`

export interface CellBusinessRowView {
  readonly idBusiness: number
  readonly companyName: string
  readonly productName: string | null
  readonly contract: string | null
  readonly value: number | null
  readonly currencyName: string | null
  readonly status: BusinessStatus
}

export interface CellBusinessList {
  readonly businesses: readonly CellBusinessRowView[]
  readonly total: number
  readonly isTruncated: boolean
}
