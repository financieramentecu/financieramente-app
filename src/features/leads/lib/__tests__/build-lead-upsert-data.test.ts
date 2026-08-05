import { describe, it, expect } from 'vitest'
import { buildLeadUpsertData } from '@/features/leads/lib/build-lead-upsert-data'
import type { CrmSyncPayload } from '@/features/leads/types/crm-sync.schema'

const basePayload: CrmSyncPayload = {
	externalCrmId: 'crm-1',
	statusKey: 'new',
}

const storedLead = {
	name: 'Juan',
	lastName: 'Perez',
	email: 'juan@example.com',
	phone: '3001234567',
	identityNumber: '123456789',
	originTag: 'facebook',
	externalUrl: 'https://crm.example/lead/1',
}

describe('buildLeadUpsertData', () => {
	it('never overwrites stored values when optional fields are absent', () => {
		const result = buildLeadUpsertData(basePayload, storedLead)

		expect(result.name).toBeUndefined()
		expect(result.lastName).toBeUndefined()
		expect(result.email).toBeUndefined()
		expect(result.phone).toBeUndefined()
		expect(result.identityNumber).toBeUndefined()
		expect(result.originTag).toBeUndefined()
		expect(result.externalUrl).toBeUndefined()
	})

	it('never overwrites stored values when optional fields are empty strings', () => {
		const result = buildLeadUpsertData(
			{ ...basePayload, name: '', email: '', phone: '' },
			storedLead
		)

		expect(result.name).toBeUndefined()
		expect(result.email).toBeUndefined()
		expect(result.phone).toBeUndefined()
	})

	it('overwrites when a present, non-empty field is provided', () => {
		const result = buildLeadUpsertData(
			{ ...basePayload, name: 'Nuevo Nombre', phone: '3009999999' },
			storedLead
		)

		expect(result.name).toBe('Nuevo Nombre')
		expect(result.phone).toBe('3009999999')
	})

	it('always includes externalCrmId and the resolved statusKey inputs', () => {
		const result = buildLeadUpsertData(basePayload, storedLead)
		expect(result.externalCrmId).toBe('crm-1')
	})

	describe('owner field merge (no sticky owner)', () => {
		it('omits idUser when ownerEmail was absent from the payload (resolvedOwnerId undefined)', () => {
			const result = buildLeadUpsertData(basePayload, storedLead, undefined)
			expect(result.idUser).toBeUndefined()
		})

		it('sets idUser when ownerEmail resolved to a user, even overwriting an existing owner', () => {
			const result = buildLeadUpsertData(basePayload, storedLead, 42)
			expect(result.idUser).toBe(42)
		})

		it('sets idUser to null when ownerEmail was present but unmatched', () => {
			const result = buildLeadUpsertData(basePayload, storedLead, null)
			expect(result.idUser).toBeNull()
		})
	})

	describe('outcomeStatus field merge (resolved upstream, D13/D19)', () => {
		it('omits outcomeStatus when resolvedOutcomeStatus is undefined', () => {
			const result = buildLeadUpsertData(
				basePayload,
				storedLead,
				undefined,
				undefined
			)
			expect(result.outcomeStatus).toBeUndefined()
		})

		it('writes outcomeStatus when resolvedOutcomeStatus is a defined enum value', () => {
			const result = buildLeadUpsertData(
				basePayload,
				storedLead,
				undefined,
				'WON'
			)
			expect(result.outcomeStatus).toBe('WON')
		})
	})
})
