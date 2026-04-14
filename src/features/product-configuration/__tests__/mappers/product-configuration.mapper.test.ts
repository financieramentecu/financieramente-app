import { describe, it, expect } from 'vitest'
import {
	prismaProductConfigToProductConfig,
	prismaProductConfigListToProductConfigs,
} from '../../mappers/product-configuration.mapper'
import { createMockPrismaProductConfiguration } from '../fixtures/mock-product-configuration'

describe('product-configuration.mapper', () => {
	describe('prismaProductConfigToProductConfig', () => {
		it('should transform Prisma entity to domain type (happy path)', () => {
			const prismaConfig = createMockPrismaProductConfiguration()

			const result = prismaProductConfigToProductConfig(prismaConfig)

			expect(result.id).toBe(1)
			expect(result.idProduct).toBe(1)
			expect(result.idClientOrigin).toBe(1)
			expect(result.idCategory).toBe(1)
			expect(result.code).toBe('CREA_PATRIMONIO-PROPIO-JUNIOR')
			expect(result.active).toBe(true)
			expect(result.idProductPercentageCommissionNewBusinesses).toBe(1)
		})

		it('should convert Date to ISO string', () => {
			const prismaConfig = createMockPrismaProductConfiguration()

			const result = prismaProductConfigToProductConfig(prismaConfig)

			expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z')
			expect(result.updatedAt).toBe('2024-01-01T00:00:00.000Z')
		})

		it('should map nested product with company', () => {
			const prismaConfig = createMockPrismaProductConfiguration()

			const result = prismaProductConfigToProductConfig(prismaConfig)

			expect(result.product.idProduct).toBe(1)
			expect(result.product.name).toBe('Crea Patrimonio')
			expect(result.product.company.idCompany).toBe(1)
			expect(result.product.company.name).toBe('Empresa Test')
		})

		it('should map nested clientOrigin', () => {
			const prismaConfig = createMockPrismaProductConfiguration()

			const result = prismaProductConfigToProductConfig(prismaConfig)

			expect(result.clientOrigin.idClientOrigin).toBe(1)
			expect(result.clientOrigin.name).toBe('Propio')
		})

		it('should map nested category', () => {
			const prismaConfig = createMockPrismaProductConfiguration()

			const result = prismaProductConfigToProductConfig(prismaConfig)

			expect(result.category.idCategory).toBe(1)
			expect(result.category.name).toBe('Junior')
		})

		it('should map ppcNewBusinesses when present', () => {
			const prismaConfig = createMockPrismaProductConfiguration()

			const result = prismaProductConfigToProductConfig(prismaConfig)

			expect(result.ppcNewBusinesses).not.toBeNull()
			expect(result.ppcNewBusinesses?.id).toBe(1)
			expect(result.ppcNewBusinesses?.active).toBe(true)
		})

		it('should handle null ppcNewBusinesses', () => {
			const prismaConfig = createMockPrismaProductConfiguration({
				productPercentageCommissionNewBusinesses: null,
				idProductPercentageCommissionNewBusinesses: null,
			})

			const result = prismaProductConfigToProductConfig(prismaConfig)

			expect(result.ppcNewBusinesses).toBeNull()
			expect(result.idProductPercentageCommissionNewBusinesses).toBeNull()
		})

		it('maps non-null code through (RF-07)', () => {
			const prismaConfig = createMockPrismaProductConfiguration({
				code: 'ALT-CODE-XYZ',
			})

			const result = prismaProductConfigToProductConfig(prismaConfig)

			expect(result.code).toBe('ALT-CODE-XYZ')
		})
	})

	describe('prismaProductConfigListToProductConfigs', () => {
		it('should transform list of entities', () => {
			const prismaList = [
				createMockPrismaProductConfiguration({ id: 1 }),
				createMockPrismaProductConfiguration({ id: 2 }),
			]

			const result = prismaProductConfigListToProductConfigs(prismaList)

			expect(result).toHaveLength(2)
			expect(result[0].id).toBe(1)
			expect(result[1].id).toBe(2)
		})

		it('should handle empty list', () => {
			const result = prismaProductConfigListToProductConfigs([])

			expect(result).toHaveLength(0)
		})
	})
})
