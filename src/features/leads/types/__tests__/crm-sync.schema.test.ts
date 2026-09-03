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

describe('crmSyncPayloadSchema — createdAt / updatedAt (historical timestamps)', () => {
	it('is undefined when createdAt and updatedAt are absent', () => {
		const result = crmSyncPayloadSchema.parse(basePayload)
		expect(result.createdAt).toBeUndefined()
		expect(result.updatedAt).toBeUndefined()
	})

	it('accepts a UTC "Z" offset and transforms it to a Date', () => {
		const result = crmSyncPayloadSchema.parse({
			...basePayload,
			createdAt: '2023-01-15T10:00:00Z',
			updatedAt: '2023-01-15T10:00:00Z',
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.createdAt?.toISOString()).toBe('2023-01-15T10:00:00.000Z')
		expect(result.updatedAt).toBeInstanceOf(Date)
	})

	it('accepts an explicit "+05:00" offset and transforms it to a Date', () => {
		const result = crmSyncPayloadSchema.parse({
			...basePayload,
			createdAt: '2023-01-15T10:00:00-05:00',
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.createdAt?.toISOString()).toBe('2023-01-15T15:00:00.000Z')
	})

	it('rejects a naive (offset-less) timestamp', () => {
		expect(() =>
			crmSyncPayloadSchema.parse({
				...basePayload,
				createdAt: '2024-01-05T10:00:00',
			})
		).toThrow()
	})

	it('rejects an offset without a colon (+0500)', () => {
		expect(() =>
			crmSyncPayloadSchema.parse({
				...basePayload,
				createdAt: '2024-01-05T10:00:00+0500',
			})
		).toThrow()
	})

	it('rejects a date-only string', () => {
		expect(() =>
			crmSyncPayloadSchema.parse({
				...basePayload,
				createdAt: '2024-01-05',
			})
		).toThrow()
	})

	it('rejects an epoch-millis string', () => {
		expect(() =>
			crmSyncPayloadSchema.parse({
				...basePayload,
				createdAt: '1700000000000',
			})
		).toThrow()
	})
})
