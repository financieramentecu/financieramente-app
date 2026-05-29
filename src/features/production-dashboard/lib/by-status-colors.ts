/**
 * Color and label constants for the Status Donut chart.
 * Pure constants — no React, no Prisma, no side effects.
 *
 * Colors are semantically fixed per status and MUST NOT change
 * with filter or navigation (per spec requirement).
 */

import type { StatusDonutKey } from '../types/production-kpi.types'

/**
 * Fixed hex color per status.
 * - VENTA_EFECTUADA → orange-500
 * - EMITIDO         → blue-500
 * - FONDEADO        → green-500
 */
export const STATUS_COLORS: Record<StatusDonutKey, string> = {
  VENTA_EFECTUADA: '#f97316',
  EMITIDO: '#3b82f6',
  FONDEADO: '#22c55e',
} as const

/**
 * Human-readable display labels per status.
 * Used in legend ("Venta Efectuada · 35%") and tooltip ("63 (45%)").
 */
export const STATUS_DISPLAY_LABELS: Record<StatusDonutKey, string> = {
  VENTA_EFECTUADA: 'Venta Efectuada',
  EMITIDO: 'Emitido',
  FONDEADO: 'Fondeado',
} as const
