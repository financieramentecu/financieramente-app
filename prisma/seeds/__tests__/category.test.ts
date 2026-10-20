import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

// category.ts must never reach a real database when imported by a test.
vi.mock('@prisma/client', () => ({
	PrismaClient: vi.fn().mockImplementation(() => ({
		$disconnect: vi.fn(),
	})),
}))

import { seedNewCategories } from '../category'

const MIA_TYPE_ID = 7

function buildPrisma() {
	return {
		categoryType: {
			upsert: vi.fn().mockResolvedValue({ id: MIA_TYPE_ID, name: 'MIA' }),
		},
		category: {
			findFirst: vi.fn().mockResolvedValue(null),
			create: vi.fn().mockResolvedValue({}),
			update: vi.fn().mockResolvedValue({}),
		},
	}
}

describe('seedNewCategories', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('creates the MIA category type itself so an empty database can be seeded', async () => {
		const prisma = buildPrisma()

		await seedNewCategories(prisma as unknown as PrismaClient)

		expect(prisma.categoryType.upsert).toHaveBeenCalledTimes(1)
		expect(prisma.categoryType.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { name: 'MIA' },
				create: expect.objectContaining({ name: 'MIA' }),
			})
		)
	})

	it('creates every category under the type it just ensured', async () => {
		const prisma = buildPrisma()

		await seedNewCategories(prisma as unknown as PrismaClient)

		expect(prisma.category.create).toHaveBeenCalledTimes(7)
		for (const [call] of prisma.category.create.mock.calls) {
			expect(call.data.idCategoryType).toBe(MIA_TYPE_ID)
		}
		const names = prisma.category.create.mock.calls.map(
			([call]) => call.data.name
		)
		expect(names).toContain('MS Junior')
		expect(names).toContain('MIA')
	})

	it('updates a category that already exists instead of duplicating it', async () => {
		const prisma = buildPrisma()
		prisma.category.findFirst.mockResolvedValue({ id: 3 })

		await seedNewCategories(prisma as unknown as PrismaClient)

		expect(prisma.category.create).not.toHaveBeenCalled()
		expect(prisma.category.update).toHaveBeenCalledTimes(7)
	})
})
