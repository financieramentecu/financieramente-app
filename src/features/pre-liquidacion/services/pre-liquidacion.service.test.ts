/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { procesarPreLiquidacion } from './pre-liquidacion.service'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

vi.mock('@/features/email/lib/preliquidacion-resumen-notification', () => ({
	sendResumenPreliquidacionEmail: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
	prisma: {
		fileImport: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		settlementCommission: {
			findMany: vi.fn(),
			update: vi.fn(),
		},
		productPercentageCommissionCategory: {
			findMany: vi.fn(),
		},
		comissionDistribution: {
			create: vi.fn(),
			findMany: vi.fn(),
		},
		commissionConfiguration: {
			findFirst: vi.fn(),
		},
		$transaction: vi.fn((callback) => callback(prisma)),
	},
}))

describe('procesarPreLiquidacion', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should return error if file does not exist', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue(null)

		const result = await procesarPreLiquidacion(1, {
			inicio: new Date(),
			fin: new Date(),
		})

		expect(result.success).toBe(false)
		expect(result.mensaje).toContain('Archivo no encontrado')
	})

	it('should return error if file is not in COMPLETADO or LOAD status', async () => {
		// Mock finding the file but with wrong status
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'PROCESANDO', // Anything other than LOAD or COMPLETADO
		} as any)

		const result = await procesarPreLiquidacion(1, {
			inicio: new Date(),
			fin: new Date(),
		})

		expect(result.success).toBe(false)
		expect(result.mensaje).toContain('El archivo debe estar en estado COMPLETADO o LOAD')
	})

	it('should return success and process records when everything is correct', async () => {
		// Mock file exists and is COMPLETADO (nameFile para correo de resumen)
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'COMPLETADO',
			nameFile: 'Test.xlsx',
		} as any)

		// Mock records found
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 100,
				status: 'SINCRONIZADO',
				commissionValue: new Decimal(100000),
				baseCommission: new Decimal(100000),
				discountPercentage: new Decimal(0.1),
				clawbackPercentage: new Decimal(0.05),
				originCommission: 'CARTERA',
				business: {
					idProductPercentageCommission: 50,
				},
			},
		] as any)

		// Mock porcentaje config
		vi.mocked(
			prisma.productPercentageCommissionCategory.findMany
		).mockResolvedValue([
			{
				id: 10,
				porcentajeDistribucion: new Decimal(0.5), // 50%
				porcentajePortfolio: new Decimal(0.6), // 60%
			},
		] as any)

		// Primera findMany: registros SINCRONIZADO; segunda: settlements PRELIQUIDADO (para resumen email)
		vi.mocked(prisma.settlementCommission.findMany)
			.mockResolvedValueOnce([
				{
					idSettlementCommission: 100,
					status: 'SINCRONIZADO',
					commissionValue: new Decimal(100000),
					baseCommission: new Decimal(100000),
					discountPercentage: new Decimal(0.1),
					clawbackPercentage: new Decimal(0.05),
					originCommission: 'CARTERA',
					business: {
						idProductPercentageCommission: 50,
					},
				},
			] as any)
			.mockResolvedValueOnce([])

		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([])

		// Mock transaction success by default (fn calls callback)

		const result = await procesarPreLiquidacion(1, {
			inicio: new Date('2024-01-01'),
			fin: new Date('2024-01-31'),
		})

		expect(result.success).toBe(true)
		expect(result.registrosProcesados).toBe(1)

		// porcentajePortfolio (60%) * 100000 = 60000
		// descuento (10%) + clawback (5%) = 15% => 60000 * 0.15 = 9000
		// final = 60000 - 9000 = 51000
		const distributionCall = vi.mocked(prisma.comissionDistribution.create).mock
			.calls[0]?.[0]
		expect(Number(distributionCall?.data.valueComission)).toBe(60000)
		expect(Number(distributionCall?.data.valueComissionFinal)).toBe(51000)
		expect(Number(distributionCall?.data.totalDiscount ?? 0)).toBe(9000)
		expect(Number(distributionCall?.data.appliedDiscountPercentage ?? 0)).toBe(0.1)

		// Verify status update to PRELIQUIDADO
		expect(prisma.settlementCommission.update).toHaveBeenCalledWith({
			where: { idSettlementCommission: 100 },
			data: { status: 'PRELIQUIDADO' },
		})

		// Verify file status update
		expect(prisma.fileImport.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idFileImport: 1 },
				data: expect.objectContaining({ status: 'PRELIQUIDADO' }),
			})
		)
	})
})
