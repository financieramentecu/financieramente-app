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

const MIA_TYPE_ID = 7

function createCategoryPrisma(existing: { id: number } | null) {
	const findCategoryType = vi.fn().mockResolvedValue({ id: MIA_TYPE_ID })
	const upsertCategoryType = vi
		.fn()
		.mockResolvedValue({ id: MIA_TYPE_ID, name: 'MIA' })
	const findFirst = vi.fn().mockResolvedValue(existing)
	const create = vi.fn().mockResolvedValue({})
	const update = vi.fn().mockResolvedValue({})
	const prisma = {
		categoryType: { findUnique: findCategoryType, upsert: upsertCategoryType },
		category: { findFirst, create, update },
	} as unknown as PrismaClient
	return {
		prisma,
		findCategoryType,
		upsertCategoryType,
		findFirst,
		create,
		update,
	}
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
				idCategoryType: MIA_TYPE_ID,
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
})

describe('seedNewCategories', () => {
	it('creates the MIA category type itself so an empty database can be seeded', async () => {
		const { prisma, upsertCategoryType } = createCategoryPrisma(null)

		await seedNewCategories(prisma)

		expect(upsertCategoryType).toHaveBeenCalledTimes(1)
		expect(upsertCategoryType).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { name: 'MIA' },
				create: expect.objectContaining({ name: 'MIA' }),
			})
		)
	})

	it('upserts every entry, including "Partner Externo", under the ensured type', async () => {
		const { prisma, findFirst, create } = createCategoryPrisma(null)

		await seedNewCategories(prisma)

		const names = findFirst.mock.calls.map(([args]) => args.where.name)
		expect(names).toEqual(CATEGORY_SEED_DATA.map((cat) => cat.name))
		expect(create).toHaveBeenCalledTimes(CATEGORY_SEED_DATA.length)
		for (const [call] of create.mock.calls) {
			expect(call.data.idCategoryType).toBe(MIA_TYPE_ID)
		}
	})

	it('updates categories that already exist instead of duplicating them', async () => {
		const { prisma, create, update } = createCategoryPrisma({ id: 3 })

		await seedNewCategories(prisma)

		expect(create).not.toHaveBeenCalled()
		expect(update).toHaveBeenCalledTimes(CATEGORY_SEED_DATA.length)
	})
})
