import { describe, expect, it } from 'vitest'
import { mergeUtmSource } from '@/features/leads/lib/merge-utm-source'

const body = { externalCrmId: 'crm-1', statusKey: 'NUEVO_LEAD' }

describe('mergeUtmSource', () => {
	it('copies the query parameter when the body omits utm_source', () => {
		expect(mergeUtmSource(body, 'money_map')).toEqual({
			...body,
			utm_source: 'money_map',
		})
	})

	it('keeps a non-empty body value over the query parameter', () => {
		expect(mergeUtmSource({ ...body, utm_source: 'Money Map' }, 'other')).toEqual({
			...body,
			utm_source: 'Money Map',
		})
	})

	it('uses the query parameter when the body value is blank', () => {
		expect(mergeUtmSource({ ...body, utm_source: '  ' }, 'money_flow')).toEqual({
			...body,
			utm_source: 'money_flow',
		})
	})

	it('leaves a non-object body untouched', () => {
		expect(mergeUtmSource(null, 'money_map')).toBeNull()
	})
})
