import { describe, it, expect } from 'vitest'
import {
	prismaClientOriginToClientOrigin,
	prismaClientOriginListToClientOrigins,
} from '../../mappers/prisma.mapper'
import { createMockPrismaClientOrigin } from '../fixtures/mock-client-origin'

describe('prisma.mapper', () => {
	describe('prismaClientOriginToClientOrigin', () => {
		it('should transform Prisma client origin to ClientOrigin (happy path)', () => {
			const prismaClientOrigin = createMockPrismaClientOrigin({
				idClientOrigin: 1,
				name: 'Propio',
				description: 'Origen propio',
				status: true,
			})

			const result = prismaClientOriginToClientOrigin(prismaClientOrigin)

			expect(result.idClientOrigin).toBe(1)
			expect(result.name).toBe('Propio')
			expect(result.description).toBe('Origen propio')
			expect(result.status).toBe(true)
		})

		it('should convert Date to ISO string', () => {
			const prismaClientOrigin = createMockPrismaClientOrigin({
				createdAt: new Date('2024-01-15T10:00:00.000Z'),
				updatedAt: new Date('2024-01-15T11:00:00.000Z'),
			})

			const result = prismaClientOriginToClientOrigin(prismaClientOrigin)

			expect(typeof result.createdAt).toBe('string')
			expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z')
			expect(typeof result.updatedAt).toBe('string')
			expect(result.updatedAt).toBe('2024-01-15T11:00:00.000Z')
		})

		it('should handle null description', () => {
			const prismaClientOrigin = createMockPrismaClientOrigin({
				description: null,
			})

			const result = prismaClientOriginToClientOrigin(prismaClientOrigin)

			expect(result.description).toBeNull()
		})

		it('should handle status as false', () => {
			const prismaClientOrigin = createMockPrismaClientOrigin({
				status: false,
			})

			const result = prismaClientOriginToClientOrigin(prismaClientOrigin)

			expect(result.status).toBe(false)
		})
	})

	describe('prismaClientOriginListToClientOrigins', () => {
		it('should transform array of Prisma client origins to ClientOrigin array', () => {
			const prismaList = [
				createMockPrismaClientOrigin({
					idClientOrigin: 1,
					name: 'Propio',
				}),
				createMockPrismaClientOrigin({
					idClientOrigin: 2,
					name: 'Referido',
				}),
			]

			const result = prismaClientOriginListToClientOrigins(prismaList)

			expect(result).toHaveLength(2)
			expect(result[0].idClientOrigin).toBe(1)
			expect(result[0].name).toBe('Propio')
			expect(result[1].idClientOrigin).toBe(2)
			expect(result[1].name).toBe('Referido')
		})

		it('should handle empty array', () => {
			const result = prismaClientOriginListToClientOrigins([])

			expect(result).toHaveLength(0)
			expect(Array.isArray(result)).toBe(true)
		})
	})
})
