/**
 * Currency formatting utilities for the production dashboard.
 * Module-level Intl.NumberFormat instances are constructed once and reused
 * across all renders — construction is expensive.
 */

const usdFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const copFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const usdCompactFormatter = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Format a USD value with 2 decimal places in es-CO locale. Example: formatUsd(185000) → "USD 185.000,00" */
export function formatUsd(value: number): string {
  return `USD ${usdFormatter.format(value)}`
}

/** Format a COP value with 0 decimal places in es-CO locale. Example: formatCop(292815000) → "COP 292.815.000" */
export function formatCop(value: number): string {
  return `COP ${copFormatter.format(value)}`
}

/** Format a USD value in compact notation. Example: formatUsdCompact(185000) → "USD 185K" */
export function formatUsdCompact(value: number): string {
  return `USD ${usdCompactFormatter.format(value)}`
}
