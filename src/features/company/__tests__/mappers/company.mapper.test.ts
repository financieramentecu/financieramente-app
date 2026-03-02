import { describe, it, expect } from 'vitest'
import {
	prismaCompanyToCompany,
	prismaCompanyListToCompanies,
} from '../../mappers/company.mapper'
import { createMockPrismaCompany } from '../fixtures/mock-company'

describe('company.mapper', () => {
	describe('prismaCompanyToCompany', () => {
		it('should transform Prisma Company to Company (happy path)', () => {
			const prismaCompany = createMockPrismaCompany({
				idCompany: 1,
				name: 'Skandia Seguros',
				status: true,
			})

			const result = prismaCompanyToCompany(prismaCompany)

			expect(result.idCompany).toBe(1)
			expect(result.name).toBe('Skandia Seguros')
			expect(result.status).toBe(true)
		})

		it('should convert Date to ISO string', () => {
			const prismaCompany = createMockPrismaCompany({
				createdAt: new Date('2024-01-15T10:00:00.000Z'),
				updatedAt: new Date('2024-01-15T11:00:00.000Z'),
			})

			const result = prismaCompanyToCompany(prismaCompany)

			expect(typeof result.createdAt).toBe('string')
			expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z')
			expect(typeof result.updatedAt).toBe('string')
			expect(result.updatedAt).toBe('2024-01-15T11:00:00.000Z')
		})

		it('should not include idTypeCompany in result', () => {
			const prismaCompany = createMockPrismaCompany({
				idTypeCompany: 'NACIONAL',
			})

			const result = prismaCompanyToCompany(prismaCompany)

			expect('idTypeCompany' in result).toBe(false)
		})

		it('should handle status as true', () => {
			const prismaCompany = createMockPrismaCompany({
				status: true,
			})

			const result = prismaCompanyToCompany(prismaCompany)

			expect(result.status).toBe(true)
		})

		it('should handle status as false', () => {
			const prismaCompany = createMockPrismaCompany({
				status: false,
			})

			const result = prismaCompanyToCompany(prismaCompany)

			expect(result.status).toBe(false)
		})

		it('should preserve all field values correctly', () => {
			const prismaCompany = createMockPrismaCompany({
				idCompany: 42,
				name: 'Unique Company',
			})

			const result = prismaCompanyToCompany(prismaCompany)

			expect(result.idCompany).toBe(42)
			expect(result.name).toBe('Unique Company')
		})
	})

	describe('prismaCompanyListToCompanies', () => {
		it('should transform list of Prisma companies to Company array (happy path)', () => {
			const prismaCompanies = [
				createMockPrismaCompany({
					idCompany: 1,
					name: 'Skandia Seguros',
				}),
				createMockPrismaCompany({
					idCompany: 2,
					name: 'Sura Seguros',
				}),
			]

			const result = prismaCompanyListToCompanies(prismaCompanies)

			expect(result).toHaveLength(2)
			expect(result[0].idCompany).toBe(1)
			expect(result[0].name).toBe('Skandia Seguros')
			expect(result[1].idCompany).toBe(2)
			expect(result[1].name).toBe('Sura Seguros')
		})

		it('should handle empty array', () => {
			const prismaCompanies: ReturnType<typeof createMockPrismaCompany>[] = []

			const result = prismaCompanyListToCompanies(prismaCompanies)

			expect(result).toHaveLength(0)
			expect(result).toEqual([])
		})

		it('should transform single company in array', () => {
			const prismaCompanies = [
				createMockPrismaCompany({
					idCompany: 1,
					name: 'Skandia Seguros',
				}),
			]

			const result = prismaCompanyListToCompanies(prismaCompanies)

			expect(result).toHaveLength(1)
			expect(result[0].idCompany).toBe(1)
			expect(result[0].name).toBe('Skandia Seguros')
		})

		it('should maintain order of companies', () => {
			const prismaCompanies = [
				createMockPrismaCompany({ idCompany: 3, name: 'Company C' }),
				createMockPrismaCompany({ idCompany: 1, name: 'Company A' }),
				createMockPrismaCompany({ idCompany: 2, name: 'Company B' }),
			]

			const result = prismaCompanyListToCompanies(prismaCompanies)

			expect(result[0].idCompany).toBe(3)
			expect(result[1].idCompany).toBe(1)
			expect(result[2].idCompany).toBe(2)
		})
	})
})
