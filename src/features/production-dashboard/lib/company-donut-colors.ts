/**
 * Color palette utilities for the Company Donut chart.
 * Pure functions — no React, no Prisma, no side effects.
 *
 * DISTINCT from origin-donut-colors (blue/green/red/purple family):
 * uses teal/indigo/rose/amber family so both donuts read as separate visualizations.
 */

/** Base hue palette — 8 deterministic, accessible colors used across slices. */
export const COMPANY_BASE_PALETTE = [
  '#0d9488', // teal-600
  '#4f46e5', // indigo-600
  '#e11d48', // rose-600
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#059669', // emerald-600
  '#dc2626', // red-600 (different shade from origin)
  '#0284c7', // sky-600
] as const

/** Lightened sibling for COP slices — visually paired with the solid base color. */
export const COMPANY_LIGHT_PALETTE = [
  '#99f6e4', // teal-200
  '#c7d2fe', // indigo-200
  '#fecdd3', // rose-200
  '#fde68a', // amber-200
  '#ddd6fe', // violet-200
  '#a7f3d0', // emerald-200
  '#fca5a5', // red-200 (different shade from origin)
  '#bae6fd', // sky-200
] as const

/** COP currency id — single source of truth (matches origin-donut-colors). */
export const COP_CURRENCY_ID = 1

/**
 * Resolves the fill color for a (paletteIndex × currencyId) slice.
 * COP slices receive the light palette variant; all other currencies receive the base palette.
 *
 * @param paletteIndex  Index into the palette, already resolved by the caller.
 *                      Wraps via modulo when >= palette length.
 * @param currencyId    Currency id from the slice.
 */
export function resolveCompanyColor(paletteIndex: number, currencyId: number): string {
  const idx = paletteIndex % COMPANY_BASE_PALETTE.length
  return currencyId === COP_CURRENCY_ID
    ? COMPANY_LIGHT_PALETTE[idx]
    : COMPANY_BASE_PALETTE[idx]
}

/**
 * Builds a Map<companyId, paletteIndex> from a list of company ids.
 * Deduplicates and sorts ascending so the same dataset always yields
 * the same color mapping across renders and reloads.
 *
 * @param companyIds  Array of company ids (may contain duplicates).
 */
export function buildCompanyPaletteMap(companyIds: readonly number[]): ReadonlyMap<number, number> {
  const sorted = [...new Set(companyIds)].sort((a, b) => a - b)
  return new Map(sorted.map((id, i) => [id, i]))
}
