import type { Level, PrismaClient } from '@prisma/client'

/**
 * Level codes created by `seedLevels` (prisma/seeds/level.ts) that the user
 * seed assigns to its demo users.
 */
export const SEED_LEVEL_CODES = {
	DEFAULT_AGENT: 'LEVEL_0',
	LEADER: 'LEVEL_2',
} as const

/**
 * Resolves a level by code and fails loudly when it is missing, so a stale
 * code can never silently leave users without a level.
 */
export async function requireLevel(
	prisma: PrismaClient,
	code: string
): Promise<Level> {
	const level = await prisma.level.findUnique({ where: { code } })
	if (!level) {
		throw new Error(
			`Level '${code}' not found. Run the level seed before seeding users.`
		)
	}
	return level
}
