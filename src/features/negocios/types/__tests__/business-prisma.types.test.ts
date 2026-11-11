import { describe, it, expect } from 'vitest'
import { businessWithRelations } from '../business-prisma.types'

describe('businessWithRelations', () => {
	it('does not load support rows: the mapper only needs their count', () => {
		expect(businessWithRelations).not.toHaveProperty('supports')
	})

	it('still counts active supports and comments', () => {
		expect(businessWithRelations._count.select.supports).toEqual({
			where: { status: true },
		})
		expect(businessWithRelations._count.select.comments).toEqual({
			where: { status: true },
		})
	})
})
