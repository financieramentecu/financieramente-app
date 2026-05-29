/**
 * Color palette utilities for the Origin Donut chart.
 * Pure functions — no React, no Prisma, no side effects.
 */

/** Base hue palette — 8 deterministic, accessible colors used across slices. */
export const ORIGIN_BASE_PALETTE = [
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#dc2626', // red-600
  '#9333ea', // purple-600
  '#ea580c', // orange-600
  '#0891b2', // cyan-600
  '#ca8a04', // yellow-600
  '#db2777', // pink-600
] as const

/** Lightened sibling for COP slices — visually paired with the solid base color. */
export const ORIGIN_LIGHT_PALETTE = [
  '#93c5fd', // blue-300
  '#86efac', // green-300
  '#fca5a5', // red-300
  '#d8b4fe', // purple-300
  '#fdba74', // orange-300
  '#67e8f9', // cyan-300
  '#fde047', // yellow-300
  '#f9a8d4', // pink-300
] as const

/** COP currency id — single source of truth (also used by ms-chart.service.ts). */
export const COP_CURRENCY_ID = 1

/**
 * Resolves the fill color for a (paletteIndex × currencyId) slice.
 * COP slices receive the light palette variant; all other currencies receive the base palette.
 *
 * @param paletteIndex  Index into the palette, already resolved by the caller.
 *                      Wraps via modulo when >= palette length.
 * @param currencyId    Currency id from the slice.
 */
export function resolveDonutColor(paletteIndex: number, currencyId: number): string {
  const idx = paletteIndex % ORIGIN_BASE_PALETTE.length
  return currencyId === COP_CURRENCY_ID
    ? ORIGIN_LIGHT_PALETTE[idx]
    : ORIGIN_BASE_PALETTE[idx]
}

/**
 * Builds a Map<originId, paletteIndex> from a list of origin ids.
 * Deduplicates and sorts ascending so the same dataset always yields
 * the same color mapping across renders and reloads.
 *
 * @param originIds  Array of origin ids (may contain duplicates).
 */
export function buildOriginPaletteMap(originIds: readonly number[]): ReadonlyMap<number, number> {
  const sorted = [...new Set(originIds)].sort((a, b) => a - b)
  return new Map(sorted.map((id, i) => [id, i]))
}
