import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
	LEVEL_SEED_DATA,
	NEXT_LEVEL_CHAIN,
	PARTNER_EXTERNAL_LEVEL_SEED,
	upsertLevel,
} from '../level'

type LevelRow = { idLevel: number; code: string }

function createLevelPrisma(initial: LevelRow[]) {
	const rows = [...initial]
	const findUnique = vi.fn(
		async ({ where }: { where: { code: string } }) =>
			rows.find((row) => row.code === where.code) ?? null
	)
	const create = vi.fn(async ({ data }: { data: { code: string } }) => {
		const row = { idLevel: rows.length + 100, code: data.code }
		rows.push(row)
		return row
	})
	const update = vi.fn(async (_args: unknown) => ({}))
	const prisma = {
		level: { findUnique, create, update },
	} as unknown as PrismaClient
	return { prisma, findUnique, create, update, rows }
}

describe('PARTNER_EXTERNAL level seed data', () => {
	it('uses oldCode equal to code so the legacy rename step never matches another level', () => {
		expect(PARTNER_EXTERNAL_LEVEL_SEED).toMatchObject({
			code: 'PARTNER_EXTERNAL',
			oldCode: 'PARTNER_EXTERNAL',
			name: 'Partner Externo',
			beneficiaryMode: 'OVERRIDE',
		})
		expect(LEVEL_SEED_DATA).toContainEqual(PARTNER_EXTERNAL_LEVEL_SEED)
	})

	it('keeps LEVEL_5 "Partner" mapped from the legacy PARTNER code, untouched', () => {
		const levelFive = LEVEL_SEED_DATA.find((lv) => lv.code === 'LEVEL_5')
		expect(levelFive).toMatchObject({ oldCode: 'PARTNER', name: 'Partner' })
	})

	it('never uses PARTNER_EXTERNAL as an oldCode of a different level', () => {
		const others = LEVEL_SEED_DATA.filter(
			(lv) => lv.code !== 'PARTNER_EXTERNAL'
		)
		expect(others.some((lv) => lv.oldCode === 'PARTNER_EXTERNAL')).toBe(false)
	})
})

describe('NEXT_LEVEL_CHAIN', () => {
	it('never contains PARTNER_EXTERNAL as a level or as a next level', () => {
		const codes = NEXT_LEVEL_CHAIN.flatMap((link) => [link.code, link.nextCode])
		expect(codes).not.toContain('PARTNER_EXTERNAL')
	})

	it('still chains LEVEL_0 to GENERAL_LEVEL unchanged', () => {
		expect(NEXT_LEVEL_CHAIN.map((link) => link.code)).toEqual([
			'LEVEL_0',
			'LEVEL_1',
			'LEVEL_2',
			'LEVEL_3',
			'LEVEL_4',
			'LEVEL_5',
			'GENERAL_LEVEL',
		])
	})
})

describe('upsertLevel for PARTNER_EXTERNAL', () => {
	it('creates the level when absent and never looks up another code', async () => {
		const { prisma, findUnique, create, update } = createLevelPrisma([
			{ idLevel: 6, code: 'LEVEL_5' },
		])

		await upsertLevel(prisma, PARTNER_EXTERNAL_LEVEL_SEED)

		expect(create).toHaveBeenCalledTimes(1)
		expect(update).not.toHaveBeenCalled()
		const lookedUp = findUnique.mock.calls.map(([args]) => args.where.code)
		expect(new Set(lookedUp)).toEqual(new Set(['PARTNER_EXTERNAL']))
	})

	it('updates in place (no duplicate, no LEVEL_5 rename) on a second run', async () => {
		const { prisma, create, update, rows } = createLevelPrisma([
			{ idLevel: 6, code: 'LEVEL_5' },
		])

		await upsertLevel(prisma, PARTNER_EXTERNAL_LEVEL_SEED)
		await upsertLevel(prisma, PARTNER_EXTERNAL_LEVEL_SEED)

		expect(create).toHaveBeenCalledTimes(1)
		expect(update).toHaveBeenCalledTimes(1)
		expect(update.mock.calls[0][0]).toMatchObject({
			where: {
				idLevel: rows.find((r) => r.code === 'PARTNER_EXTERNAL')?.idLevel,
			},
			data: { code: 'PARTNER_EXTERNAL' },
		})
		expect(rows.filter((r) => r.code === 'LEVEL_5')).toHaveLength(1)
	})
})
