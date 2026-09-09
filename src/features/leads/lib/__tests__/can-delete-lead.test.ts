import { describe, it, expect } from 'vitest'
import { canDeleteLead } from '@/features/leads/lib/can-delete-lead'
import type { LeadOutcomeStatus } from '@prisma/client'

function buildLead(overrides: {
	idBusiness?: number | null
	outcomeStatus?: LeadOutcomeStatus
}) {
	return {
		idBusiness: null,
		outcomeStatus: 'OPEN' as LeadOutcomeStatus,
		...overrides,
	}
}

describe('canDeleteLead', () => {
	it('returns true for an open, unconverted lead', () => {
		expect(
			canDeleteLead(buildLead({ idBusiness: null, outcomeStatus: 'OPEN' }))
		).toBe(true)
	})

	it.each<LeadOutcomeStatus>(['OPEN', 'WON', 'LOST', 'ABANDONED'])(
		'returns false when idBusiness is set, regardless of outcomeStatus (%s)',
		(outcomeStatus) => {
			expect(
				canDeleteLead(buildLead({ idBusiness: 42, outcomeStatus }))
			).toBe(false)
		}
	)

	it('returns false for a WON lead', () => {
		expect(
			canDeleteLead(buildLead({ idBusiness: null, outcomeStatus: 'WON' }))
		).toBe(false)
	})

	it('returns false for a LOST lead', () => {
		expect(
			canDeleteLead(buildLead({ idBusiness: null, outcomeStatus: 'LOST' }))
		).toBe(false)
	})

	it('returns false for an ABANDONED lead', () => {
		expect(
			canDeleteLead(buildLead({ idBusiness: null, outcomeStatus: 'ABANDONED' }))
		).toBe(false)
	})
})
