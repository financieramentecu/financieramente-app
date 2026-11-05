import { describe, expect, it } from 'vitest'
import { leadCrmEventInputSchema } from '@/features/leads/crm/lead-crm-event.schema'

describe('leadCrmEventInputSchema', () => {
	it('accepts a bounded plain-text note event', () => {
		const parsed = leadCrmEventInputSchema.parse({
			type: 'NOTE_ADDED',
			payload: { note: 'Llamar a la estudiante el viernes' },
		})

		expect(parsed.payload).toEqual({
			note: 'Llamar a la estudiante el viernes',
		})
	})

	it('rejects service-owned and arbitrary event types plus free-form payload keys', () => {
		expect(() =>
			leadCrmEventInputSchema.parse({ type: 'CREATED', payload: {} })
		).toThrow()
		expect(() =>
			leadCrmEventInputSchema.parse({ type: 'RAW_SQL', payload: {} })
		).toThrow()
		expect(() =>
			leadCrmEventInputSchema.parse({
				type: 'NOTE_ADDED',
				payload: { note: 'ok', html: '<script>alert(1)</script>' },
			})
		).toThrow()
	})

	it('rejects HTML in note content', () => {
		expect(() =>
			leadCrmEventInputSchema.parse({
				type: 'NOTE_ADDED',
				payload: { note: '<img src=x onerror=alert(1)>' },
			})
		).toThrow()
	})
})
