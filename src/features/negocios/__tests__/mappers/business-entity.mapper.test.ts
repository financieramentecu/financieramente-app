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

		it('should map name and lastName on client', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.client.name).toBe('María')
			expect(result.client.lastName).toBe('García López')
			expect(result.client.fullName).toBe('María García López')
		})

		it('should build client fullName correctly', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.client.fullName).toBe('María García López')
			expect(result.client.identityNumber).toBe('1234567890')
			expect(result.client.email).toBe('maria.garcia@email.com')
		})

		it('should build agent fullName correctly', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.agent.fullName).toBe('Carlos Money Strategist Pérez')
			expect(result.agent.roleName).toBe('Money Strategist')
			expect(result.agent.categoryName).toBe('Junior')
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

		it('should handle null category in user', () => {
			const businessWithNullCategory = {
				...mockPrismaBusiness,
				user: {
					...mockPrismaBusiness.user,
					idCategory: null,
					category: null,
				},
			}

			const result = prismaBusinessToEntity(businessWithNullCategory)

			expect(result.agent.categoryName).toBeNull()
		})

		it('should map null dateIssued to null', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.dateIssued).toBeNull()
		})

		it('should map dateIssued to ISO string', () => {
			const issued = new Date('2024-03-20T14:30:00.000Z')
			const result = prismaBusinessToEntity({
				...mockPrismaBusiness,
				dateIssued: issued,
			})

			expect(result.dateIssued).toBe('2024-03-20T14:30:00.000Z')
		})

		// ── 4.5: dateAnchored and hasPayments mapping ──────────────────
		it('should map null dateAnchored to null', () => {
			const result = prismaBusinessToEntity({
				...mockPrismaBusiness,
				dateAnchored: null,
			})

			expect(result.dateAnchored).toBeNull()
		})

		it('should map dateAnchored DateTime to ISO string', () => {
			const anchored = new Date('2025-04-18T12:00:00.000Z')
			const result = prismaBusinessToEntity({
				...mockPrismaBusiness,
				dateAnchored: anchored,
			})

			expect(result.dateAnchored).toBe('2025-04-18T12:00:00.000Z')
		})

		it('should map _count.payments === 0 to hasPayments: false', () => {
			const result = prismaBusinessToEntity({
				...mockPrismaBusiness,
				numAportes: null,
				_count: { payments: 0, supports: 0 },
				payments: [],
				supports: [],
			})

			expect(result.hasPayments).toBe(false)
			expect(result.hasPendingPaymentFunding).toBe(false)
			expect(result.fundedAportes).toBe(0)
		})

		it('should map hasPendingPaymentFunding true when payments include FONDEADO', () => {
			const result = prismaBusinessToEntity({
				...mockPrismaBusiness,
				numAportes: 3,
				_count: { payments: 3, supports: 0 },
				payments: [{ idAnnualPayment: 1, status: 'FONDEADO' }],
				supports: [],
			})

			expect(result.hasPayments).toBe(true)
			expect(result.hasPendingPaymentFunding).toBe(true)
			expect(result.fundedAportes).toBe(1)
		})

		it('should map hasPendingPaymentFunding false when all payments are PAGO_ANTICIPADO', () => {
			const result = prismaBusinessToEntity({
				...mockPrismaBusiness,
				numAportes: 3,
				_count: { payments: 3, supports: 0 },
				payments: [
					{ idAnnualPayment: 1, status: 'PAGO_ANTICIPADO' },
					{ idAnnualPayment: 2, status: 'PAGO_ANTICIPADO' },
					{ idAnnualPayment: 3, status: 'PAGO_ANTICIPADO' },
				],
			})

			expect(result.hasPayments).toBe(true)
			expect(result.hasPendingPaymentFunding).toBe(false)
			expect(result.fundedAportes).toBe(0)
		})

		// ── novedadStatus / novedadMarkedAt / novedadResolvedAt mapping ──
		it('should map null novedad fields to null by default', () => {
			const result = prismaBusinessToEntity(mockPrismaBusiness)

			expect(result.novedadStatus).toBeNull()
			expect(result.novedadMarkedAt).toBeNull()
			expect(result.novedadResolvedAt).toBeNull()
		})

		it('should map novedadStatus PENDIENTE and novedadMarkedAt to ISO string', () => {
			const markedAt = new Date('2026-05-10T09:00:00.000Z')
			const result = prismaBusinessToEntity({
				...mockPrismaBusiness,
				novedadStatus: 'PENDIENTE',
				novedadMarkedAt: markedAt,
			})

			expect(result.novedadStatus).toBe('PENDIENTE')
			expect(result.novedadMarkedAt).toBe('2026-05-10T09:00:00.000Z')
			expect(result.novedadResolvedAt).toBeNull()
		})

		it('should map novedadStatus RESUELTA and novedadResolvedAt to ISO string', () => {
			const markedAt = new Date('2026-05-10T09:00:00.000Z')
			const resolvedAt = new Date('2026-05-20T15:30:00.000Z')
			const result = prismaBusinessToEntity({
				...mockPrismaBusiness,
				novedadStatus: 'RESUELTA',
				novedadMarkedAt: markedAt,
				novedadResolvedAt: resolvedAt,
			})

			expect(result.novedadStatus).toBe('RESUELTA')
			expect(result.novedadMarkedAt).toBe('2026-05-10T09:00:00.000Z')
			expect(result.novedadResolvedAt).toBe('2026-05-20T15:30:00.000Z')
		})
	})
})
