import { describe, it, expect } from 'vitest'
import { parseLeadOutcomeStatus } from '@/features/leads/lib/parse-lead-outcome-status'
import { resolveOutcomeStatus } from '@/features/leads/lib/lead-outcome-status'
import type { LeadOutcomeStatus } from '@prisma/client'

describe('parseLeadOutcomeStatus', () => {
	it.each(['open', 'won', 'lost', 'abandoned'])(
		'resolves the case-insensitive token "%s"',
		(token) => {
			const result = parseLeadOutcomeStatus(token)
			expect(result.rejected).toBe(false)
			if (!result.rejected) {
				expect(result.value).toBe(token.toUpperCase())
			}
		}
	)

	it('resolves mixed case "Won" to WON', () => {
		const result = parseLeadOutcomeStatus('Won')
		expect(result.rejected).toBe(false)
		if (!result.rejected) {
			expect(result.value).toBe('WON')
		}
	})

	it('rejects an unrecognized value, naming it in the reason', () => {
		const result = parseLeadOutcomeStatus('en_revision')
		expect(result.rejected).toBe(true)
		if (result.rejected) {
			expect(result.reason).toContain('en_revision')
		}
	})

	it('never returns OPEN as a default for an unrecognized input', () => {
		const result = parseLeadOutcomeStatus('en_revision')
		expect(result.rejected).toBe(true)
		expect((result as { value?: string }).value).toBeUndefined()
	})
})

describe('parseLeadOutcomeStatus + resolveOutcomeStatus invariant', () => {
	it.each<LeadOutcomeStatus>(['OPEN', 'WON', 'LOST', 'ABANDONED'])(
		'feeding an already-parsed %s into resolveOutcomeStatus never yields unresolved',
		(token) => {
			const parsed = parseLeadOutcomeStatus(token)
			expect(parsed.rejected).toBe(false)
			if (parsed.rejected) return

			const result = resolveOutcomeStatus(parsed.value, undefined)
			expect(result.unresolved).toBe(false)
		}
	)
})
