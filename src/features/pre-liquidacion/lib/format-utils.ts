/**
 * Shared formatting utilities for pre-liquidación tables and modals.
 * Currency uses es-CO locale (Colombian peso conventions: dot as thousands separator).
 */

import { formatPercentDisplay } from '@/features/shared/lib/format-percent'
import { getAppLocale } from '@/features/shared/lib/app-locale'

const currencyFormatter = new Intl.NumberFormat('es-CO', {
	style: 'currency',
	currency: 'COP',
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
	currencyDisplay: 'narrowSymbol',
})

const numberFormatter = new Intl.NumberFormat('es-CO', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
})

/** Formats a number as COP currency: $50.000 */
export function formatCurrency(value: number): string {
	return currencyFormatter.format(value)
}

/** Formats a plain number with thousand separators: 1.234 */
export function formatNumber(value: number): string {
	return numberFormatter.format(value)
}

/** Formats a decimal fraction (0–1) as a percentage for display (shared RF-01 rules). */
export function formatPct(value: number): string {
	return formatPercentDisplay(value * 100, getAppLocale())
}

/** Formats an ISO date string to a readable short date: 2026-03-28 → 28 mar 2026 */
export function formatDate(isoString: string | null | undefined): string {
	if (!isoString) return '—'
	const date = new Date(isoString)
	if (isNaN(date.getTime())) return '—'
	return date.toLocaleDateString('es-CO', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC',
	})
}
