import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { requireLevel, SEED_LEVEL_CODES } from '../require-level'

function buildPrisma(level: { idLevel: number; code: string } | null) {
	return {
		level: { findUnique: vi.fn().mockResolvedValue(level) },
	}
}

describe('requireLevel', () => {
	it('returns the level that matches the code', async () => {
		const prisma = buildPrisma({ idLevel: 4, code: 'LEVEL_0' })

		const level = await requireLevel(
			prisma as unknown as PrismaClient,
			SEED_LEVEL_CODES.DEFAULT_AGENT
		)

		expect(level.idLevel).toBe(4)
		expect(prisma.level.findUnique).toHaveBeenCalledWith({
			where: { code: 'LEVEL_0' },
		})
	})

	it('fails with a clear message instead of leaving users without a level', async () => {
		const prisma = buildPrisma(null)

		await expect(
			requireLevel(prisma as unknown as PrismaClient, 'JUNIOR')
		).rejects.toThrow(/JUNIOR/)
	})

	it('only references level codes created by the level seed', () => {
		expect(Object.values(SEED_LEVEL_CODES)).toEqual(['LEVEL_0', 'LEVEL_2'])
	})
})
