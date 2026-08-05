import type { LeadOutcomeStatus } from '@prisma/client'
import type { BadgeProps } from '@/features/shared/ui/badge'

export interface ResolveOutcomeStatusResult {
	value: LeadOutcomeStatus | undefined
	unresolved: boolean
	locked: boolean
}

const RECOGNIZED_VALUES: readonly LeadOutcomeStatus[] = [
	'OPEN',
	'WON',
	'LOST',
	'ABANDONED',
]

function normalizeRaw(raw: string): LeadOutcomeStatus | undefined {
	const upper = raw.trim().toUpperCase() as LeadOutcomeStatus
	return RECOGNIZED_VALUES.includes(upper) ? upper : undefined
}

/**
 * Pure resolver for the incoming `outcomeStatus` webhook field.
 *
 * Never touches the database — `current` is the lead's currently stored
 * `outcomeStatus` (`undefined` on create), supplied by the caller from a row
 * it already fetched (see `lead-sync.service.ts`).
 *
 * - Absent/empty `raw` is never an attempt: `{ value: undefined, unresolved:
 *   false, locked: false }` — the caller omits the key and the stored value
 *   is preserved.
 * - An unrecognized `raw` normalizes to `'OPEN'` and sets `unresolved: true`
 *   (D12) — ingestion never rejects on CRM vocabulary drift.
 * - `WON` is terminal (D19-D23): once `current === 'WON'`, any different
 *   resolved value is discarded and `locked: true` is set instead, but the
 *   returned `value` is still the explicit `'WON'` (D20), never `undefined`.
 *   `unresolved` is computed independently of the lock (D21) — an
 *   unrecognized raw against a WON lead sets BOTH flags.
 */
export function resolveOutcomeStatus(
	raw: string | undefined,
	current: LeadOutcomeStatus | undefined
): ResolveOutcomeStatusResult {
	if (raw === undefined || raw.trim() === '') {
		return { value: undefined, unresolved: false, locked: false }
	}

	const normalized = normalizeRaw(raw)
	const unresolved = normalized === undefined
	const resolved = normalized ?? 'OPEN'

	if (current === 'WON') {
		const locked = resolved !== 'WON'
		return { value: 'WON', unresolved, locked }
	}

	return { value: resolved, unresolved, locked: false }
}

export const LEAD_OUTCOME_STATUS_LABELS: Record<LeadOutcomeStatus, string> = {
	OPEN: 'Abierto',
	WON: 'Ganado',
	LOST: 'Perdido',
	ABANDONED: 'Abandonado',
}

export const LEAD_OUTCOME_STATUS_BADGE_VARIANTS: Record<
	LeadOutcomeStatus,
	NonNullable<BadgeProps['variant']>
> = {
	OPEN: 'info',
	WON: 'success',
	LOST: 'destructive',
	ABANDONED: 'neutral',
}
