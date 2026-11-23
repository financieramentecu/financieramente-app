import { describe, expect, it } from 'vitest'
import { createLeadSchema } from '../create-lead.schema'

describe('createLeadSchema', () => {
	it('trims native contact data and strips server-owned fields', () => {
		expect(
			createLeadSchema.parse({
				name: ' Ana ',
				email: 'ana@example.com',
				originTag: 'FORGED',
				externalCrmId: 'x',
			})
		).toEqual({ name: 'Ana', email: 'ana@example.com' })
	})
	it.each([
		{ name: ' ', phone: '123' },
		{ name: 'Ana' },
		{ name: 'Ana', email: 'bad' },
		{ name: 'Ana', phone: 'x'.repeat(31) },
		{ name: 'Ana', phone: '123', idUser: 1.2 },
	])('rejects invalid data %j', (input) => {
		expect(createLeadSchema.safeParse(input).success).toBe(false)
	})
	it('accepts document-only contact', () => {
		expect(
			createLeadSchema.safeParse({ name: 'Ana', identityNumber: 'AB123' })
				.success
		).toBe(true)
	})
})
