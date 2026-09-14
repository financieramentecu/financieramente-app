import type { LeadFunnelColumn } from '@prisma/client'

export type ResolveFunnelColumnByNameResult =
	| { rejected: false; value: LeadFunnelColumn }
	| { rejected: true; reason: string }

/**
 * Pure exact, case-sensitive match of `columna_funnel` against active
 * `LeadFunnelColumn.name`. Deliberately does NOT normalize (no trim, no
 * case-folding) and never falls back to a "Sin mapear" default — the CSV
 * import path must fail closed on any mismatch, unlike the CRM webhook's
 * `resolveFunnelColumn` (which normalizes and falls back).
 */
export function resolveFunnelColumnByName(
	name: string,
	activeColumns: readonly LeadFunnelColumn[]
): ResolveFunnelColumnByNameResult {
	const columnsByName = new Map(activeColumns.map((column) => [column.name, column]))
	const match = columnsByName.get(name)

	if (match) {
		return { rejected: false, value: match }
	}

	const validNames = activeColumns.map((column) => column.name).join(', ')
	return {
		rejected: true,
		reason: `columna_funnel "${name}" no coincide con ninguna columna activa. Valores válidos: ${validNames}`,
	}
}
