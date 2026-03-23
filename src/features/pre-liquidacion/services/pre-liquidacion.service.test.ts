/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	procesarPreLiquidacion,
	obtenerRegistrosParaLiquidacion,
	liquidarRegistros,
	rezagarRegistros,
} from './pre-liquidacion.service'
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
			updateMany: vi.fn(),
			count: vi.fn(),
		},
		productPercentageCommissionCategory: {
			findMany: vi.fn(),
		},
		comissionDistribution: {
			create: vi.fn(),
			findMany: vi.fn(),
		},
		clawback: {
			create: vi.fn(),
		},
		clawbackBalance: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		commissionDiscount: {
			findMany: vi.fn(),
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

	it('should return error if file is not in LOAD status', async () => {
		// Mock finding the file but with wrong status
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'PROCESANDO', // Anything other than LOAD
		} as any)

		const result = await procesarPreLiquidacion(1, {
			inicio: new Date(),
			fin: new Date(),
		})

		expect(result.success).toBe(false)
		expect(result.mensaje).toContain(
			'El archivo debe estar en estado LOAD para ser pre-liquidado'
		)
	})

	it('should return success and process records when everything is correct', async () => {
		// Mock file exists and is LOAD (nameFile para correo de resumen)
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'LOAD',
			nameFile: 'Test.xlsx',
		} as any)

		// Mock records found
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 100,
				status: 'SYNCHRONIZED',
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

		// Primera findMany: registros SYNCHRONIZED; segunda: settlements PRE-SETTLED (para resumen email)
		vi.mocked(prisma.settlementCommission.findMany)
			.mockResolvedValueOnce([
				{
					idSettlementCommission: 100,
					status: 'SYNCHRONIZED',
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
		const calls = vi.mocked(prisma.comissionDistribution.create).mock.calls
		const distributionCall = calls && calls[0] ? calls[0][0] : undefined
		const distributionData =
			distributionCall && distributionCall.data
				? distributionCall.data
				: ({} as any)
		expect(Number(distributionData.valueComission)).toBe(60000)
		expect(Number(distributionData.valueComissionFinal)).toBe(51000)
		expect(Number(distributionData.totalDiscount || 0)).toBe(9000)
		expect(Number(distributionData.appliedDiscountPercentage || 0)).toBe(0.1)

		// Verify status update to PRE-SETTLED
		expect(prisma.settlementCommission.update).toHaveBeenCalledWith({
			where: { idSettlementCommission: 100 },
			data: { status: 'PRE-SETTLED' },
		})

		// Verify file status update
		expect(prisma.fileImport.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idFileImport: 1 },
				data: expect.objectContaining({ preLiquidacionDate: expect.any(Date) }),
			})
		)
	})

	it('should create Clawback per category and NOT update ClawbackBalance when POLIZA with clawbackPercentage > 0', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'LOAD',
			nameFile: 'Test.xlsx',
		} as any)

		vi.mocked(prisma.settlementCommission.findMany)
			.mockResolvedValueOnce([
				{
					idSettlementCommission: 200,
					status: 'SYNCHRONIZED',
					commissionType: 'POLIZA',
					originCommission: null,
					isClawback: false,
					commissionValue: new Decimal(100000),
					baseCommission: new Decimal(100000),
					discountPercentage: new Decimal(0.1),
					clawbackPercentage: new Decimal(0.1),
					business: {
						idProductPercentageCommission: 50,
						user: { idUser: 42 },
					},
				},
			] as any)
			.mockResolvedValueOnce([])

		vi.mocked(
			prisma.productPercentageCommissionCategory.findMany
		).mockResolvedValue([
			{
				id: 10,
				porcentajeDistribucion: new Decimal(0.5),
				porcentajePortfolio: null,
			},
			{
				id: 11,
				porcentajeDistribucion: new Decimal(0.5),
				porcentajePortfolio: null,
			},
		] as any)

		vi.mocked(prisma.comissionDistribution.create)
			.mockResolvedValueOnce({
				idComissionDistribution: 301,
			} as any)
			.mockResolvedValueOnce({
				idComissionDistribution: 302,
			} as any)

		const result = await procesarPreLiquidacion(1, {
			inicio: new Date('2024-01-01'),
			fin: new Date('2024-01-31'),
		})

		expect(result.success).toBe(true)
		expect(result.registrosProcesados).toBe(1)

		// Two categories => two distributions, two clawbacks (valorClawback = 10% of bruta > 0 each)
		expect(prisma.clawback.create).toHaveBeenCalledTimes(2)
		expect(prisma.clawback.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					idUser: 42,
					state: 'RETENIDO',
					idComissionDistribution: expect.any(Number),
				}),
			})
		)

		// Assert that ClawbackBalance is NOT touched
		expect(prisma.clawbackBalance.findUnique).not.toHaveBeenCalled()
		expect(prisma.clawbackBalance.create).not.toHaveBeenCalled()
		expect(prisma.clawbackBalance.update).not.toHaveBeenCalled()
	})
})

describe('obtenerRegistrosParaLiquidacion', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns null when file does not exist', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue(null)
		const result = await obtenerRegistrosParaLiquidacion(999)
		expect(result).toBeNull()
	})

	it('returns only SYNCHRONIZED records and correct archivo.fileType', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			nameFile: 'test.xlsx',
			fileType: 'POLIZA',
			loadDate: new Date('2024-01-15'),
			totalRecord: 10,
			sincronizadoRecord: 2,
			rezagadoRecord: 0,
			user: { name: 'John', lastName: 'Doe' },
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 100,
				idFileImport: 1,
				idBusiness: 1,
				contract: null,
				status: 'SYNCHRONIZED',
				descripcion: 'Tipo A',
				commissionValue: new Decimal(1000),
				baseCommission: new Decimal(1000),
				discountPercentage: new Decimal(0.1),
				clawbackPercentage: new Decimal(0),
				isClawback: false,
				isLag: false,
				syncDate: new Date('2024-01-10'),
				lagDate: null,
				startDate: null,
				endDate: null,
				business: {
					contract: 'C-001',
					user: { name: 'Jane', lastName: 'Smith' },
				},
			},
		] as any)

		const result = await obtenerRegistrosParaLiquidacion(1)
		expect(result).not.toBeNull()
		expect(result!.archivo.fileType).toBe('POLIZA')
		expect(result!.registros).toHaveLength(1)
		expect(result!.registros[0].idSettlementCommission).toBe(100)
		expect(prisma.settlementCommission.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					idFileImport: 1,
					status: 'SYNCHRONIZED',
				},
			})
		)
	})

	it('returns empty registros with archivo metadata when file has no SYNCHRONIZED records', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			nameFile: 'empty.xlsx',
			fileType: 'VOLUNTARIA',
			loadDate: new Date('2024-01-15'),
			totalRecord: 5,
			sincronizadoRecord: 0,
			rezagadoRecord: 0,
			user: { name: 'John', lastName: 'Doe' },
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])

		const result = await obtenerRegistrosParaLiquidacion(1)
		expect(result).not.toBeNull()
		expect(result!.registros).toHaveLength(0)
		expect(result!.archivo.fileType).toBe('VOLUNTARIA')
		expect(result!.archivo.nombreArchivo).toBe('empty.xlsx')
	})
})

describe('liquidarRegistros', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('updates only SYNCHRONIZED ids and returns liquidated count', async () => {
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 3,
		})
		vi.mocked(prisma.settlementCommission.count).mockResolvedValue(0)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		const result = await liquidarRegistros([1, 2, 3], 10, 1)
		expect(result.liquidated).toBe(3)
		expect(result.fileCompleted).toBe(true)
		expect(prisma.settlementCommission.updateMany).toHaveBeenCalledWith({
			where: {
				idSettlementCommission: { in: [1, 2, 3] },
				status: 'SYNCHRONIZED',
			},
			data: { status: 'SETTLED', updatedAt: expect.any(Date) },
		})
	})

	it('sets FileImport COMPLETED when 0 SYNCHRONIZED remain', async () => {
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 5,
		})
		vi.mocked(prisma.settlementCommission.count).mockResolvedValue(0)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		await liquidarRegistros([1, 2, 3, 4, 5], 10, 1)
		expect(prisma.fileImport.update).toHaveBeenCalledWith({
			where: { idFileImport: 1 },
			data: { status: 'COMPLETED', updatedAt: expect.any(Date) },
		})
	})

	it('does not set FileImport COMPLETED when some SYNCHRONIZED remain', async () => {
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 3,
		})
		vi.mocked(prisma.settlementCommission.count).mockResolvedValue(7)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		const result = await liquidarRegistros([1, 2, 3], 10, 1)
		expect(result.fileCompleted).toBe(false)
		expect(result.liquidated).toBe(3)
		expect(prisma.fileImport.update).not.toHaveBeenCalled()
	})

	it('skips non-SYNCHRONIZED ids and returns actual liquidated count', async () => {
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.settlementCommission.count).mockResolvedValue(4)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		const result = await liquidarRegistros([1, 2], 10, 1)
		expect(result.liquidated).toBe(1)
		expect(result.fileCompleted).toBe(false)
	})
})

describe('rezagarRegistros', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('updates only SYNCHRONIZED ids to LAG with lagDate and isLag', async () => {
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 2,
		})

		const result = await rezagarRegistros([4, 5], 10)
		expect(result.lagged).toBe(2)
		expect(prisma.settlementCommission.updateMany).toHaveBeenCalledWith({
			where: {
				idSettlementCommission: { in: [4, 5] },
				status: 'SYNCHRONIZED',
			},
			data: {
				status: 'LAG',
				isLag: true,
				lagDate: expect.any(Date),
				updatedAt: expect.any(Date),
			},
		})
	})

	it('does not set FileImport COMPLETED (rezagar never completes file)', async () => {
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 5,
		})

		await rezagarRegistros([1, 2, 3, 4, 5], 10)
		expect(prisma.fileImport.update).not.toHaveBeenCalled()
	})
})
