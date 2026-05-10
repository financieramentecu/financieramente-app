import { describe, it, expect } from 'vitest'
import {
	prismaLevelToLevel,
	prismaLevelListToLevels,
} from '../../mappers/level.mapper'
import { createMockPrismaLevel, BeneficiaryMode } from '../fixtures/mock-level'

describe('level.mapper', () => {
	describe('prismaLevelToLevel', () => {
		it('should transform Prisma Level to Level (happy path)', () => {
			const prismaLevel = createMockPrismaLevel({
				idLevel: 1,
				code: 'LEVEL001',
				name: 'Agente Experto',
				levelType: {
					id: 1,
					name: 'MMS',
					description: 'Descripción completa',
					status: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				descripcion: 'Descripción completa',
				status: true,
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.idLevel).toBe(1)
			expect(result.code).toBe('LEVEL001')
			expect(result.name).toBe('Agente Experto')
			expect(result.typeLevel).toBe('MMS')
			expect(result.descripcion).toBe('Descripción completa')
			expect(result.status).toBe(true)
		})

		it('should convert Date to ISO string', () => {
			const prismaLevel = createMockPrismaLevel({
				createdAt: new Date('2024-01-15T10:00:00.000Z'),
				updatedAt: new Date('2024-01-15T11:00:00.000Z'),
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(typeof result.createdAt).toBe('string')
			expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z')
			expect(typeof result.updatedAt).toBe('string')
			expect(result.updatedAt).toBe('2024-01-15T11:00:00.000Z')
		})

		it('should handle null descripcion correctly', () => {
			const prismaLevel = createMockPrismaLevel({
				descripcion: null,
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.descripcion).toBeNull()
		})

		it('should handle status as true', () => {
			const prismaLevel = createMockPrismaLevel({
				status: true,
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.status).toBe(true)
		})

		it('should handle status as false', () => {
			const prismaLevel = createMockPrismaLevel({
				status: false,
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.status).toBe(false)
		})

		it('should preserve all field values correctly', () => {
			const prismaLevel = createMockPrismaLevel({
				idLevel: 42,
				code: 'UNIQUE_CODE',
				name: 'Unique Name',
				levelType: {
					id: 2,
					name: 'ALIADO',
					description: 'Unique description',
					status: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				descripcion: 'Unique description',
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.idLevel).toBe(42)
			expect(result.code).toBe('UNIQUE_CODE')
			expect(result.name).toBe('Unique Name')
			expect(result.typeLevel).toBe('ALIADO')
			expect(result.descripcion).toBe('Unique description')
		})

		it('should handle typeLevel MMS', () => {
			const prismaLevel = createMockPrismaLevel({
				levelType: {
					id: 1,
					name: 'MMS',
					description: null,
					status: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.typeLevel).toBe('MMS')
		})

		it('should handle typeLevel ALIADO', () => {
			const prismaLevel = createMockPrismaLevel({
				levelType: {
					id: 2,
					name: 'ALIADO',
					description: null,
					status: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.typeLevel).toBe('ALIADO')
		})

		it('should handle typeLevel TRINITY', () => {
			const prismaLevel = createMockPrismaLevel({
				levelType: {
					id: 3,
					name: 'TRINITY',
					description: null,
					status: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.typeLevel).toBe('TRINITY')
		})
	})

	describe('beneficiaryMode and fixedBeneficiaryUser mapping', () => {
		it('should map beneficiaryMode OVERRIDE correctly', () => {
			const prismaLevel = createMockPrismaLevel({
				beneficiaryMode: BeneficiaryMode.OVERRIDE,
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.beneficiaryMode).toBe('OVERRIDE')
		})

		it('should map beneficiaryMode BENEFICIARIO_GENERAL correctly', () => {
			const prismaLevel = createMockPrismaLevel({
				beneficiaryMode: BeneficiaryMode.BENEFICIARIO_GENERAL,
				idFixedBeneficiaryUser: 5,
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.beneficiaryMode).toBe('BENEFICIARIO_GENERAL')
		})

		it('should map idFixedBeneficiaryUser as null when not set', () => {
			const prismaLevel = createMockPrismaLevel({
				idFixedBeneficiaryUser: null,
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.idFixedBeneficiaryUser).toBeNull()
		})

		it('should map idFixedBeneficiaryUser when set', () => {
			const prismaLevel = createMockPrismaLevel({
				idFixedBeneficiaryUser: 10,
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.idFixedBeneficiaryUser).toBe(10)
		})

		it('should map fixedBeneficiaryUser as null when relation not included', () => {
			const prismaLevel = createMockPrismaLevel({
				idFixedBeneficiaryUser: null,
			})
			const result = prismaLevelToLevel(prismaLevel)

			expect(result.fixedBeneficiaryUser).toBeNull()
		})

		it('should map fixedBeneficiaryUser when relation is included', () => {
			const prismaLevel = createMockPrismaLevel({
				beneficiaryMode: BeneficiaryMode.BENEFICIARIO_GENERAL,
				idFixedBeneficiaryUser: 7,
				fixedBeneficiaryUser: {
					idUser: 7,
					name: 'Ana',
					lastName: 'García',
					email: 'ana@example.com',
				},
			})

			const result = prismaLevelToLevel(prismaLevel)

			expect(result.fixedBeneficiaryUser).toEqual({
				idUser: 7,
				name: 'Ana',
				lastName: 'García',
				email: 'ana@example.com',
			})
		})
	})

	describe('color, idNextLevel, and enum mapping', () => {
		it('should map color field correctly', () => {
			const prismaLevel = createMockPrismaLevel({
				color: '#ABC123',
			})
			const result = prismaLevelToLevel(prismaLevel)
			expect(result.color).toBe('#ABC123')
		})

		it('should map idNextLevel and nextLevel.id + nextLevel.name when relation is present', () => {
			const prismaLevel = createMockPrismaLevel({
				idNextLevel: 7,
				nextLevel: {
					idLevel: 7,
					name: 'Siguiente Nivel',
					code: 'LEVEL-007',
					idLevelType: 1,
					descripcion: null,
					color: '#FFFFFF',
					status: true,
					beneficiaryMode: 'OVERRIDE' as const,
					idFixedBeneficiaryUser: null,
					idNextLevel: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			})
			const result = prismaLevelToLevel(prismaLevel)
			expect(result.idNextLevel).toBe(7)
			expect(result.nextLevel).not.toBeNull()
			expect(result.nextLevel?.id).toBe(7)
			expect(result.nextLevel?.name).toBe('Siguiente Nivel')
		})

		it('should map nextLevel as null when relation is absent', () => {
			const prismaLevel = createMockPrismaLevel({
				idNextLevel: null,
				nextLevel: undefined,
			})
			const result = prismaLevelToLevel(prismaLevel)
			expect(result.idNextLevel).toBeNull()
			expect(result.nextLevel).toBeNull()
		})

		it('should map OVERRIDE beneficiaryMode correctly', () => {
			const prismaLevel = createMockPrismaLevel({
				beneficiaryMode: BeneficiaryMode.OVERRIDE,
			})
			const result = prismaLevelToLevel(prismaLevel)
			expect(result.beneficiaryMode).toBe('OVERRIDE')
		})

		it('should map BENEFICIARIO_GENERAL beneficiaryMode correctly', () => {
			const prismaLevel = createMockPrismaLevel({
				beneficiaryMode: BeneficiaryMode.BENEFICIARIO_GENERAL,
				idFixedBeneficiaryUser: 5,
			})
			const result = prismaLevelToLevel(prismaLevel)
			expect(result.beneficiaryMode).toBe('BENEFICIARIO_GENERAL')
		})
	})

	describe('prismaLevelListToLevels', () => {
		it('should transform list of Prisma levels to Levels array (happy path)', () => {
			const prismaLevels = [
				createMockPrismaLevel({
					idLevel: 1,
					code: 'LEVEL001',
					name: 'Agente Experto',
				}),
				createMockPrismaLevel({
					idLevel: 2,
					code: 'LEVEL002',
					name: 'Agente Básico',
				}),
			]

			const result = prismaLevelListToLevels(prismaLevels)

			expect(result).toHaveLength(2)
			expect(result[0].idLevel).toBe(1)
			expect(result[0].code).toBe('LEVEL001')
			expect(result[0].name).toBe('Agente Experto')
			expect(result[1].idLevel).toBe(2)
			expect(result[1].code).toBe('LEVEL002')
			expect(result[1].name).toBe('Agente Básico')
		})

		it('should handle empty array', () => {
			const prismaLevels: (ReturnType<typeof createMockPrismaLevel>)[] = []

			const result = prismaLevelListToLevels(prismaLevels)

			expect(result).toHaveLength(0)
			expect(result).toEqual([])
		})

		it('should transform single level in array', () => {
			const prismaLevels = [
				createMockPrismaLevel({
					idLevel: 1,
					code: 'LEVEL001',
					name: 'Agente Único',
				}),
			]

			const result = prismaLevelListToLevels(prismaLevels)

			expect(result).toHaveLength(1)
			expect(result[0].idLevel).toBe(1)
			expect(result[0].code).toBe('LEVEL001')
			expect(result[0].name).toBe('Agente Único')
		})

		it('should preserve all level properties in list', () => {
			const prismaLevels = [
				createMockPrismaLevel({
					idLevel: 1,
					code: 'LEVEL001',
					name: 'Agente MMS',
					levelType: {
						id: 1,
						name: 'MMS',
						description: 'Descripción 1',
						status: true,
						createdAt: new Date(),
						updatedAt: new Date()
					},
					descripcion: 'Descripción 1',
					status: true,
				}),
				createMockPrismaLevel({
					idLevel: 2,
					code: 'LEVEL002',
					name: 'Agente Aliado',
					levelType: {
						id: 2,
						name: 'ALIADO',
						description: null,
						status: true,
						createdAt: new Date(),
						updatedAt: new Date()
					},
					descripcion: null,
					status: false,
				}),
			]

			const result = prismaLevelListToLevels(prismaLevels)

			expect(result[0].typeLevel).toBe('MMS')
			expect(result[0].descripcion).toBe('Descripción 1')
			expect(result[0].status).toBe(true)
			expect(result[1].typeLevel).toBe('ALIADO')
			expect(result[1].descripcion).toBeNull()
			expect(result[1].status).toBe(false)
		})

		it('should maintain order of levels', () => {
			const prismaLevels = [
				createMockPrismaLevel({ idLevel: 3, code: 'LEVEL003' }),
				createMockPrismaLevel({ idLevel: 1, code: 'LEVEL001' }),
				createMockPrismaLevel({ idLevel: 2, code: 'LEVEL002' }),
			]

			const result = prismaLevelListToLevels(prismaLevels)

			expect(result[0].idLevel).toBe(3)
			expect(result[1].idLevel).toBe(1)
			expect(result[2].idLevel).toBe(2)
		})
	})
})
