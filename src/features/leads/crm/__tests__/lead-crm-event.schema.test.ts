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

	it.each(['CALL_LOGGED', 'MEETING_LOGGED', 'EMAIL_LOGGED', 'WHATSAPP_LOGGED'])(
		'accepts a logged %s with summary, outcome and duration',
		(type) => {
			const parsed = leadCrmEventInputSchema.parse({
				type,
				payload: { summary: 'Interesada en el plan', outcome: 'CONNECTED', durationMinutes: 12 },
			})
			expect(parsed).toEqual({
				type,
				payload: { summary: 'Interesada en el plan', outcome: 'CONNECTED', durationMinutes: 12 },
			})
		}
	)

	it('accepts a past occurredAt and rejects a future one', () => {
		const past = '2026-11-01T15:00:00.000Z'
		expect(
			leadCrmEventInputSchema.parse({ type: 'CALL_LOGGED', payload: { summary: 'ok', occurredAt: past } })
		).toMatchObject({ payload: { occurredAt: past } })
		const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()
		expect(() =>
			leadCrmEventInputSchema.parse({ type: 'CALL_LOGGED', payload: { summary: 'ok', occurredAt: future } })
		).toThrow()
	})

	it('rejects invalid logged payloads', () => {
		expect(() => leadCrmEventInputSchema.parse({ type: 'CALL_LOGGED', payload: {} })).toThrow()
		expect(() =>
			leadCrmEventInputSchema.parse({ type: 'CALL_LOGGED', payload: { summary: 'ok', outcome: 'MAYBE' } })
		).toThrow()
		expect(() =>
			leadCrmEventInputSchema.parse({ type: 'CALL_LOGGED', payload: { summary: 'ok', durationMinutes: 0 } })
		).toThrow()
		expect(() =>
			leadCrmEventInputSchema.parse({ type: 'CALL_LOGGED', payload: { summary: '<b>x</b>' } })
		).toThrow()
		expect(() =>
			leadCrmEventInputSchema.parse({ type: 'TASK_COMPLETED', payload: { summary: 'x' } })
		).toThrow()
	})
})
