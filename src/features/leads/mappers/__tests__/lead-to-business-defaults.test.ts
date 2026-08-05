import { describe, it, expect } from 'vitest'
import { mapLeadToBusinessDefaults } from '@/features/leads/mappers/lead-to-business-defaults'
import type { LeadDetail } from '@/features/leads/types/lead.types'

function buildLead(overrides: Partial<LeadDetail> = {}): LeadDetail {
	return {
		idLead: 1,
		externalCrmId: 'crm-1',
		name: null,
		lastName: null,
		email: null,
		phone: null,
		identityNumber: null,
		originTag: null,
		externalUrl: null,
		idUser: null,
		ownerName: null,
		idLeadFunnelColumn: 1,
		idBusiness: null,
		outcomeStatus: 'OPEN',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}
}

describe('mapLeadToBusinessDefaults', () => {
	it('maps null fields to empty strings', () => {
		const result = mapLeadToBusinessDefaults(buildLead())

		expect(result.name).toBe('')
		expect(result.lastNames).toBe('')
		expect(result.email).toBe('')
		expect(result.phone).toBe('')
		expect(result.identityNumber).toBe('')
	})

	it('maps Lead.lastName to BusinessFormProps.defaultValues.lastNames', () => {
		const result = mapLeadToBusinessDefaults(buildLead({ lastName: 'Perez' }))
		expect(result.lastNames).toBe('Perez')
	})

	it('maps present contact fields through', () => {
		const result = mapLeadToBusinessDefaults(
			buildLead({
				name: 'Juan',
				lastName: 'Perez',
				email: 'juan@example.com',
				phone: '3001234567',
			})
		)

		expect(result.name).toBe('Juan')
		expect(result.lastNames).toBe('Perez')
		expect(result.email).toBe('juan@example.com')
		expect(result.phone).toBe('3001234567')
	})

	it('handles an absent identityNumber without throwing', () => {
		expect(() =>
			mapLeadToBusinessDefaults(buildLead({ identityNumber: null }))
		).not.toThrow()
		expect(mapLeadToBusinessDefaults(buildLead({ identityNumber: null })).identityNumber).toBe('')
	})
})
