import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

const { MockPrismaClient } = vi.hoisted(() => ({
	MockPrismaClient: vi.fn(),
}))

vi.mock('@prisma/client', () => ({ PrismaClient: MockPrismaClient }))

import {
	CATEGORY_SEED_DATA,
	PARTNER_EXTERNAL_CATEGORY_SEED,
	seedNewCategories,
	upsertCategory,
} from '../category'

function createCategoryPrisma(existing: { id: number } | null) {
	const findCategoryType = vi.fn().mockResolvedValue({ id: 7 })
	const findFirst = vi.fn().mockResolvedValue(existing)
	const create = vi.fn().mockResolvedValue({})
	const update = vi.fn().mockResolvedValue({})
	const prisma = {
		categoryType: { findUnique: findCategoryType },
		category: { findFirst, create, update },
	} as unknown as PrismaClient
	return { prisma, findCategoryType, findFirst, create, update }
}

describe('category seed module', () => {
	beforeEach(() => {
		MockPrismaClient.mockClear()
	})

	it('has no import-time side effect (does not instantiate PrismaClient)', async () => {
		vi.resetModules()
		MockPrismaClient.mockClear()

		await import('../category')

		expect(MockPrismaClient).not.toHaveBeenCalled()
	})

	it('defines "Partner Externo" as a MIA category', () => {
		expect(PARTNER_EXTERNAL_CATEGORY_SEED).toMatchObject({
			name: 'Partner Externo',
			categoryTypeName: 'MIA',
		})
		expect(CATEGORY_SEED_DATA).toContainEqual(PARTNER_EXTERNAL_CATEGORY_SEED)
	})

	it('keeps the existing "Partner" category (LEVEL_5) intact', () => {
		expect(CATEGORY_SEED_DATA.some((cat) => cat.name === 'Partner')).toBe(true)
	})

	it('creates the category when absent', async () => {
		const { prisma, create, update } = createCategoryPrisma(null)
		await upsertCategory(prisma, PARTNER_EXTERNAL_CATEGORY_SEED)
		expect(create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				name: 'Partner Externo',
				idCategoryType: 7,
			}),
		})
		expect(update).not.toHaveBeenCalled()
	})

	it('updates instead of duplicating when present', async () => {
		const { prisma, create, update } = createCategoryPrisma({ id: 41 })
		await upsertCategory(prisma, PARTNER_EXTERNAL_CATEGORY_SEED)
		expect(create).not.toHaveBeenCalled()
		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: 41 } })
		)
	})

	it('seedNewCategories upserts every entry, including "Partner Externo"', async () => {
		const { prisma, findFirst } = createCategoryPrisma({ id: 1 })
		await seedNewCategories(prisma)
		const names = findFirst.mock.calls.map(([args]) => args.where.name)
		expect(names).toEqual(CATEGORY_SEED_DATA.map((cat) => cat.name))
	})
})
