import { describe, it, expect } from 'vitest'
import { crmSyncPayloadSchema } from '@/features/leads/types/crm-sync.schema'

const basePayload = {
	externalCrmId: 'crm-1',
	statusKey: 'new',
}

describe('crmSyncPayloadSchema — outcomeStatus', () => {
	it('parses without error when outcomeStatus is absent', () => {
		const result = crmSyncPayloadSchema.parse(basePayload)
		expect(result.outcomeStatus).toBeUndefined()
	})

	it('parses without error when outcomeStatus is an empty string', () => {
		const result = crmSyncPayloadSchema.parse({
			...basePayload,
			outcomeStatus: '',
		})
		expect(result.outcomeStatus).toBe('')
	})

	it('trims and uppercases a present outcomeStatus', () => {
		const result = crmSyncPayloadSchema.parse({
			...basePayload,
			outcomeStatus: '  won  ',
		})
		expect(result.outcomeStatus).toBe('WON')
	})

	it('does not reject an unrecognized outcomeStatus value (never rejects the webhook)', () => {
		const result = crmSyncPayloadSchema.parse({
			...basePayload,
			outcomeStatus: 'closed_lost_forever',
		})
		expect(result.outcomeStatus).toBe('CLOSED_LOST_FOREVER')
	})
})
