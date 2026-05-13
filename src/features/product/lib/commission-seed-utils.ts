import type { ContributionType } from '@/features/product/types/product.types'

/**
 * Strip the trailing '%' and parse as float.
 * Values are stored in 0-100 range (e.g., "76.5%" → 76.5).
 * Returns 0 for invalid/empty input.
 */
export function parseCommissionPercentage(raw: string): number {
  const clean = raw.replace('%', '').trim()
  if (!clean) return 0
  const value = parseFloat(clean)
  return isNaN(value) ? 0 : value
}

/**
 * Normalize the APORTE CSV column to a ContributionType enum value.
 * UNICO → UNICO, everything else → REGULAR.
 */
export function normalizeContributionType(raw: string): ContributionType {
  return raw.trim().toUpperCase() === 'UNICO' ? 'UNICO' : 'REGULAR'
}
