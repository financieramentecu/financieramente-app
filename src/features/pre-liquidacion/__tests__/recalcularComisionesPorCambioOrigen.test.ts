import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recalcularComisionesPorCambioOrigen } from '../services/pre-liquidacion.service'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

enum BeneficiaryMode {
	OVERRIDE = 'OVERRIDE',
	BENEFICIARIO_GENERAL = 'BENEFICIARIO_GENERAL',
}

vi.mock('@/features/email/lib/preliquidacion-resumen-notification', () => ({
	sendResumenPreliquidacionEmail: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock de Prisma con su interfaz de transacción
vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: vi.fn(async (cb) => cb(prisma)),
		business: { findUnique: vi.fn(), update: vi.fn() },
		productConfiguration: { findFirst: vi.fn() },
		settlementCommission: { findMany: vi.fn() },
		comissionDistribution: { updateMany: vi.fn(), create: vi.fn() },
		clawback: { deleteMany: vi.fn(), create: vi.fn() },
		productPercentageCommissionCategory: { findMany: vi.fn() },
		user: { findUnique: vi.fn() },
		auditLog: { create: vi.fn() }
	},
}))

describe('recalcularComisionesPorCambioOrigen', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('throws an error when business does not exist', async () => {
		vi.mocked(prisma.business.findUnique).mockResolvedValue(null)

		await expect(
			recalcularComisionesPorCambioOrigen(1, 2, { name: 'Admin', idUser: 99 })
		).rejects.toThrow('Negocio no encontrado')
	})

	it('throws an error when no product configuration exists for the new origin', async () => {
		vi.mocked(prisma.business.findUnique).mockResolvedValue({
			idBusiness: 1,
			productPercentageCommission: {
				productConfiguration: {
					idProduct: 10,
					idCategory: 5,
				}
			}
		} as never)

		vi.mocked(prisma.productConfiguration.findFirst).mockResolvedValue(null)

		await expect(
			recalcularComisionesPorCambioOrigen(1, 2, { name: 'Admin', idUser: 99 })
		).rejects.toThrow('No existe configuración de producto para el nuevo origen')
	})

	it('throws an error when no active percentages exist for the new configuration', async () => {
		vi.mocked(prisma.business.findUnique).mockResolvedValue({
			idBusiness: 1,
			productPercentageCommission: {
				productConfiguration: {
					idProduct: 10,
					idCategory: 5,
				}
			}
		} as never)

		vi.mocked(prisma.productConfiguration.findFirst).mockResolvedValue({
			idProductConfiguration: 20,
			productPercentageCommissions: [], // no active percentages
		} as never)

		await expect(
			recalcularComisionesPorCambioOrigen(1, 2, { name: 'Admin', idUser: 99 })
		).rejects.toThrow('No existe distribución de comisiones para el nuevo origen')
	})

	it('executes a transaction deleting old distributions and creating new ones for PRE-SETTLED commissions only', async () => {
		// Mock correct finds
		vi.mocked(prisma.business.findUnique).mockResolvedValue({
			idBusiness: 1,
			productPercentageCommission: {
				productConfiguration: {
					idProduct: 10,
					idCategory: 5,
				}
			},
			user: { idUser: 123 },
		} as never)

		vi.mocked(prisma.productConfiguration.findFirst).mockResolvedValue({
			idProductConfiguration: 20,
			productPercentageCommissions: [{ idProductPercentageCommission: 99, active: true }],
		} as never)

		// Mock the pre-settled commissions
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 100,
				status: 'PRE-SETTLED',
				commissionValue: new Decimal(1000),
				baseCommission: new Decimal(1000),
				discountPercentage: new Decimal(0.12), // preserved discount
				clawbackPercentage: new Decimal(0),
				isClawback: false,
				originCommission: 'INICIAL',
			},
		] as never)

		// Mock new percentages setup
		vi.mocked(prisma.productPercentageCommissionCategory.findMany).mockResolvedValue([
			{
				id: 77,
				level: {
					idCategory: 1,
					code: 'GENERAL',
					name: 'GENERAL',
					beneficiaryMode: BeneficiaryMode.BENEFICIARIO_GENERAL,
					idFixedBeneficiaryUser: 123,
					fixedBeneficiaryUser: { idUser: 123, active: true },
				},
				porcentajeDistribucion: new Decimal(0.5),
				porcentajePortfolio: null,
			},
		] as never)

		vi.mocked(prisma.business.update).mockResolvedValue({ idBusiness: 1 } as never)
		vi.mocked(prisma.comissionDistribution.create).mockResolvedValue({ idComissionDistribution: 500 } as never)

		await recalcularComisionesPorCambioOrigen(1, 2, { name: 'Admin', idUser: 99 })

		// verify business updated
		expect(prisma.business.update).toHaveBeenCalledWith({
			where: { idBusiness: 1 },
			data: expect.objectContaining({ 
				idClientOrigin: 2, 
				idProductPercentageCommission: 99 
			}),
		})

		// verify soft delete (updateMany instead of deleteMany)
		expect(prisma.comissionDistribution.updateMany).toHaveBeenCalledWith({
			where: { idSettlementCommission: { in: [100] } },
			data: { isActive: false },
		})
		expect(prisma.clawback.deleteMany).toHaveBeenCalledWith({
			where: { 
				comissionDistribution: {
					idSettlementCommission: { in: [100] } 
				} 
			},
		})

		// verify creation logic uses existing discount (12%)
		// 1000 * 0.50 (category) = 500 gross. 
		// Net = 500 - (500 * 0.12) = 500 - 60 = 440
		expect(prisma.comissionDistribution.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				idSettlementCommission: 100,
				idPercentajeCommisionCategory: 77,
				idBeneficiaryUser: 123,
				valueComission: new Decimal(500),
				valueCommissionWithDiscount: new Decimal(440),
				valueComissionFinal: new Decimal(440),
				appliedDiscountPercentage: new Decimal(0.12),
				totalDiscount: new Decimal(60),
				status: 'PRE-SETTLED',
			}),
		})
	})
})
