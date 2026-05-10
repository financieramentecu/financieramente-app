import { Level, User } from '@prisma/client'
import { Level as LevelDomain } from '../types/level.types'

export type PrismaLevelWithRelations = Level & {
	levelType?: { id: number; name: string; description: string | null; status: boolean; createdAt: Date; updatedAt: Date } | null
	fixedBeneficiaryUser?: Pick<User, 'idUser' | 'name' | 'lastName' | 'email'> | null
	beneficiaryMode?: string | null
	idFixedBeneficiaryUser?: number | null
	nextLevel?: {
		idLevel: number
		name: string
		[key: string]: unknown
	} | null
}

/**
 * Maps a Prisma Level to a domain Level
 */
export const prismaLevelToLevel = (
	prisma: PrismaLevelWithRelations
): LevelDomain => {
	// Use levelType relation name if available, fallback to legacy cast, then default
	const typeLevel = prisma.levelType?.name || (prisma as unknown as { typeLevel?: string }).typeLevel || 'MMS'

	const fixedBeneficiaryUser = prisma.fixedBeneficiaryUser
		? {
				idUser: prisma.fixedBeneficiaryUser.idUser,
				name: prisma.fixedBeneficiaryUser.name,
				lastName: prisma.fixedBeneficiaryUser.lastName ?? '',
				email: prisma.fixedBeneficiaryUser.email,
			}
		: null

	const nextLevel = prisma.nextLevel
		? {
				id: prisma.nextLevel.idLevel,
				name: prisma.nextLevel.name,
			}
		: null

	const beneficiaryMode = (prisma.beneficiaryMode as string) === 'BENEFICIARIO_GENERAL'
		? 'BENEFICIARIO_GENERAL' as const
		: 'OVERRIDE' as const

	return {
		idLevel: prisma.idLevel,
		code: prisma.code,
		name: prisma.name,
		typeLevel,
		idLevelType: prisma.levelType?.id || 1,
		descripcion: prisma.descripcion === null ? null : (prisma.descripcion || ''),
		color: prisma.color,
		status: prisma.status,
		beneficiaryMode,
		idFixedBeneficiaryUser: prisma.idFixedBeneficiaryUser ?? null,
		fixedBeneficiaryUser,
		idNextLevel: prisma.idNextLevel ?? null,
		nextLevel,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	}
}

/**
 * Maps a list of Prisma Levels to domain Levels
 */
export const prismaLevelListToLevels = (
	prismaList: PrismaLevelWithRelations[]
): LevelDomain[] => {
	return prismaList.map(prismaLevelToLevel)
}

/**
 * Backwards compatibility alias
 */
export const mapToDomain = prismaLevelToLevel
