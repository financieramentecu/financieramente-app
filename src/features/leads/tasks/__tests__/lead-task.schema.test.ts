import { describe, expect, it } from 'vitest'
import { leadTaskCreateSchema, leadTaskUpdateSchema } from '@/features/leads/tasks/lead-task.schema'

describe('lead task schemas', () => {
	it('accepts a bounded plain-text follow-up task', () => {
		expect(leadTaskCreateSchema.safeParse({ title: 'Llamar mañana', assignedTo: 7 }).success).toBe(true)
	})

	it('rejects HTML and unsupported lifecycle fields', () => {
		expect(leadTaskCreateSchema.safeParse({ title: '<script>x</script>', assignedTo: 7 }).success).toBe(false)
		expect(leadTaskUpdateSchema.safeParse({ status: 'OPEN' }).success).toBe(false)
	})

	it('accepts a task type and defaults to TODO', () => {
		expect(leadTaskCreateSchema.parse({ title: 'Llamar', assignedTo: 7 }).type).toBe('TODO')
		expect(leadTaskCreateSchema.parse({ title: 'Llamar', assignedTo: 7, type: 'CALL' }).type).toBe('CALL')
		expect(leadTaskCreateSchema.safeParse({ title: 'x', assignedTo: 7, type: 'FAX' }).success).toBe(false)
	})

	it('accepts reschedule with a date or null and rejects it without dueAt', () => {
		expect(leadTaskUpdateSchema.safeParse({ action: 'reschedule', dueAt: '2026-11-10T15:00:00.000Z' }).success).toBe(true)
		expect(leadTaskUpdateSchema.safeParse({ action: 'reschedule', dueAt: null }).success).toBe(true)
		expect(leadTaskUpdateSchema.safeParse({ action: 'reschedule' }).success).toBe(false)
		expect(leadTaskUpdateSchema.safeParse({ action: 'complete', dueAt: null }).success).toBe(false)
		expect(leadTaskUpdateSchema.safeParse({ action: 'complete', comment: 'El cliente aceptó' }).success).toBe(true)
		expect(leadTaskUpdateSchema.safeParse({ action: 'reassign', assignedTo: 3, comment: 'nota' }).success).toBe(false)
		expect(leadTaskUpdateSchema.safeParse({ action: 'move', bucket: 'today' }).success).toBe(true)
		expect(leadTaskUpdateSchema.safeParse({ action: 'move' }).success).toBe(false)
	})
})
