import { describe, it, expect } from 'vitest'
import { prismaBusinessToEntity } from '../../mappers/business-entity.mapper'
import {
	mockPrismaBusiness,
	mockPrismaBusinessWithoutPeriodicity,
	mockPrismaBusinessClientNoLastName,
} from '../fixtures/mock-prisma-business'

describe('prismaBusinessToEntity', () => {
	describe('Happy Path', () => {
		it('should transform Prisma business to BusinessEntity', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.id).toBe(mockPrismaBusiness.idBusiness)
			expect(result.contract).toBe(mockPrismaBusiness.contract)
			expect(result.term).toBe(mockPrismaBusiness.term)
			expect(result.status).toBe(mockPrismaBusiness.status)
		})

		it('should convert Decimal value to number', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(typeof result.value).toBe('number')
			expect(result.value).toBe(15000000)
		})

		it('should convert Date to ISO string', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(typeof result.createdAt).toBe('string')
			expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z')
		})

		it('should build client fullName correctly', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.client.fullName).toBe('María García López')
			expect(result.client.identityNumber).toBe('1234567890')
			expect(result.client.email).toBe('maria.garcia@email.com')
		})

		it('should build agent fullName correctly', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.agent.fullName).toBe('Carlos Agente Pérez')
			expect(result.agent.roleName).toBe('Agente/Coach')
			expect(result.agent.email).toBe('carlos.agente@financieramente.com')
		})

		it('should flatten product information', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.product.id).toBe(1)
			expect(result.product.name).toBe('Crédito Personal')
			expect(result.product.companyId).toBe(1)
			expect(result.product.companyName).toBe('Skandia')
		})

		it('should map currency correctly', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.currency.id).toBe(1)
			expect(result.currency.name).toBe('COP')
		})

		it('should map periodicity correctly', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.periodicity).not.toBeNull()
			expect(result.periodicity?.id).toBe(1)
			expect(result.periodicity?.name).toBe('Mensual')
		})

		it('should map clientOrigin correctly', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.clientOrigin.id).toBe(1)
			expect(result.clientOrigin.name).toBe('Referido')
		})
	})

	describe('Flujos Alternos', () => {
		it('should handle null periodicity', () => {
			const result = prismaBusinessToEntity(
				mockPrismaBusinessWithoutPeriodicity
			)

			expect(result.periodicity).toBeNull()
		})

		it('should handle null lastName in client', () => {
			const result = prismaBusinessToEntity(mockPrismaBusinessClientNoLastName)

			expect(result.client.fullName).toBe('María')
		})

		it('should handle null contract', () => {
			const businessWithNullContract = {
				...mockPrismaBusiness,
				contract: null,
			}

			const result = prismaBusinessToEntity(businessWithNullContract)

			expect(result.contract).toBeNull()
		})

		it('should handle null email in client', () => {
			const businessWithNullEmail = {
				...mockPrismaBusiness,
				client: {
					...mockPrismaBusiness.client,
					email: null,
				},
			}

			const result = prismaBusinessToEntity(businessWithNullEmail)

			expect(result.client.email).toBeNull()
		})

		it('should handle null phone in client', () => {
			const businessWithNullPhone = {
				...mockPrismaBusiness,
				client: {
					...mockPrismaBusiness.client,
					phone: null,
				},
			}

			const result = prismaBusinessToEntity(businessWithNullPhone)

			expect(result.client.phone).toBeNull()
		})

		it('should handle null role in user', () => {
			const businessWithNullRole = {
				...mockPrismaBusiness,
				user: {
					...mockPrismaBusiness.user,
					role: null,
				},
			}

			const result = prismaBusinessToEntity(businessWithNullRole)

			expect(result.agent.roleName).toBeNull()
		})
	})
})
