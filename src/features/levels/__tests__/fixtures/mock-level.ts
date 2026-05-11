import type { Level } from '../../types/level.types'
import { LevelType as LevelTypeDomain } from '../../types/level.types'
import { PrismaLevelWithRelations as MapperPrismaLevelWithRelations } from '../../mappers/level.mapper'

export enum BeneficiaryMode {
	OVERRIDE = 'OVERRIDE',
	BENEFICIARIO_GENERAL = 'BENEFICIARIO_GENERAL',
}

/**
 * Mock level for testing (Domain Type)
 */
export const MOCK_LEVEL: Level = {
	idLevel: 1,
	code: 'LEVEL-001',
	name: 'Nivel de Prueba',
	idLevelType: 1,
	typeLevel: 'MMS',
	descripcion: 'Este es un nivel de prueba para tests',
	color: '#1A73E8',
	status: true,
	beneficiaryMode: 'OVERRIDE',
	idFixedBeneficiaryUser: null,
	fixedBeneficiaryUser: null,
	idNextLevel: null,
	nextLevel: null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
}

export const createMockLevel = (
	overrides: Partial<Level> = {}
): Level => ({
	...MOCK_LEVEL,
	...overrides,
})

export const createMockLevelListResponse = (
	levels = [MOCK_LEVEL]
) => ({
	levels,
	pagination: {
		total: levels.length,
		page: 1,
		pageSize: 10,
		totalPages: 1,
	},
})

export const createMockLevelsByType = (
	type: LevelTypeDomain = 'MMS',
	count = 3
) => {
	return Array.from({ length: count }, (_, i) => ({
		...MOCK_LEVEL,
		idLevel: i + 1,
		code: `LEVEL-${type}-${i + 1}`,
		typeLevel: type,
	}))
}

/**
 * Mock Prisma Level for testing (Prisma Client Type)
 * Uses the exported type from the mapper to ensure compatibility
 */
export const createMockPrismaLevel = (
	overrides: Partial<MapperPrismaLevelWithRelations> = {}
): MapperPrismaLevelWithRelations => {
	const now = new Date()
	const base: MapperPrismaLevelWithRelations = {
		idLevel: 1,
		code: 'LEVEL-001',
		name: 'Nivel 1',
		levelType: null,
		descripcion: 'Descripción 1',
		color: '#1A73E8',
		status: true,
		beneficiaryMode: 'OVERRIDE',
		idFixedBeneficiaryUser: null,
		idNextLevel: null,
		createdAt: now,
		updatedAt: now,
	}
	return {
		...base,
		...overrides as MapperPrismaLevelWithRelations,
	}
}
