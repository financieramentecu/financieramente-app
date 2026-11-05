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
})
