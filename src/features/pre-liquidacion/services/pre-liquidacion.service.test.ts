/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	procesarPreLiquidacion,
	obtenerRegistrosParaLiquidacion,
	liquidarRegistros,
	rezagarRegistros,
} from './pre-liquidacion.service'
import { prisma } from '@/lib/prisma'
import { BeneficiaryMode } from '@prisma/client'
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
			updateMany: vi.fn(),
		},
		clawback: {
			create: vi.fn(),
			update: vi.fn(),
		},
		user: {
			findUnique: vi.fn(),
		},
		clawbackBalance: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			upsert: vi.fn(),
		},
		business: {
			updateMany: vi.fn(),
		},
		commissionDiscount: {
			findMany: vi.fn(),
		},
		$transaction: vi.fn((callback) => callback(prisma)),
	},
}))

function mockFileQueueCounts(syncRemaining: number, preSettledRemaining: number) {
	vi.mocked(prisma.settlementCommission.count).mockImplementation(
		((args: any) => {
			const status = args?.where?.status
			if (status === 'SYNCHRONIZED') return Promise.resolve(syncRemaining)
			if (status === 'PRE-SETTLED') return Promise.resolve(preSettledRemaining)
			return Promise.resolve(0)
		}) as typeof prisma.settlementCommission.count
	)
}

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

		vi.mocked(
			prisma.productPercentageCommissionCategory.findMany
		).mockResolvedValue([
			{
				id: 10,
				porcentajeDistribucion: new Decimal(0.5),
				porcentajePortfolio: new Decimal(0.6),
				category: {
					idCategory: 1,
					code: 'GENERAL',
					beneficiaryMode: BeneficiaryMode.FIXED_BENEFICIARY,
					idFixedBeneficiaryUser: 77,
					fixedBeneficiaryUser: { idUser: 77, active: true },
				},
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
		// 0 remaining SYNCHRONIZED → FileImport status advances to PRE-SETTLED
		vi.mocked(prisma.settlementCommission.count).mockResolvedValue(0)

		// Mock transaction success by default (fn calls callback)

		const result = await procesarPreLiquidacion(1, {
			inicio: new Date('2024-01-01'),
			fin: new Date('2024-01-31'),
		})

		expect(result.success).toBe(true)
		expect(result.registrosProcesados).toBe(1)

		// porcentajePortfolio (60%) * 100000 = 60000
		// tax 10% => 6000; post-tax 54000; clawback 5% of 54000 => 2700; final 51300
		const calls = vi.mocked(prisma.comissionDistribution.create).mock.calls
		const distributionCall = calls && calls[0] ? calls[0][0] : undefined
		const distributionData =
			distributionCall && distributionCall.data
				? distributionCall.data
				: ({} as any)
		expect(Number(distributionData.valueComission)).toBe(60000)
		expect(Number(distributionData.valueComissionFinal)).toBe(51300)
		expect(Number(distributionData.valueCommissionWithDiscount)).toBe(54000)
		expect(Number(distributionData.totalDiscount || 0)).toBe(6000)
		expect(Number(distributionData.appliedDiscountPercentage || 0)).toBe(0.1)
		expect(distributionData.idBeneficiaryUser).toBe(77)

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
				category: {
					idCategory: 1,
					code: 'A',
					beneficiaryMode: BeneficiaryMode.FIXED_BENEFICIARY,
					idFixedBeneficiaryUser: 77,
					fixedBeneficiaryUser: { idUser: 77, active: true },
				},
			},
			{
				id: 11,
				porcentajeDistribucion: new Decimal(0.5),
				porcentajePortfolio: null,
				category: {
					idCategory: 2,
					code: 'B',
					beneficiaryMode: BeneficiaryMode.FIXED_BENEFICIARY,
					idFixedBeneficiaryUser: 77,
					fixedBeneficiaryUser: { idUser: 77, active: true },
				},
			},
		] as any)

		vi.mocked(prisma.comissionDistribution.create)
			.mockResolvedValueOnce({
				idComissionDistribution: 301,
			} as any)
			.mockResolvedValueOnce({
				idComissionDistribution: 302,
			} as any)

		vi.mocked(prisma.settlementCommission.count).mockResolvedValue(0)

		const result = await procesarPreLiquidacion(1, {
			inicio: new Date('2024-01-01'),
			fin: new Date('2024-01-31'),
		})

		expect(result.success).toBe(true)
		expect(result.registrosProcesados).toBe(1)

		// Two categories => two distributions, two clawbacks (10% of post-tax amount each)
		expect(prisma.clawback.create).toHaveBeenCalledTimes(2)
		expect(prisma.clawback.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					idUser: 77,
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

	it('omits registro when UPLINE_CHAIN has no matching user in chain', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'LOAD',
			nameFile: 'Test.xlsx',
		} as never)

		vi.mocked(prisma.settlementCommission.findMany)
			.mockResolvedValueOnce([
				{
					idSettlementCommission: 300,
					status: 'SYNCHRONIZED',
					commissionType: 'VOLUNTARIA',
					originCommission: null,
					isClawback: false,
					commissionValue: new Decimal(100000),
					baseCommission: new Decimal(100000),
					discountPercentage: new Decimal(0.1),
					clawbackPercentage: new Decimal(0),
					business: {
						idProductPercentageCommission: 50,
						user: { idUser: 1 },
					},
				},
			] as never)
			.mockResolvedValueOnce([])

		vi.mocked(
			prisma.productPercentageCommissionCategory.findMany
		).mockResolvedValue([
			{
				id: 10,
				porcentajeDistribucion: new Decimal(1),
				porcentajePortfolio: null,
				category: {
					idCategory: 99,
					code: 'NOMATCH',
					beneficiaryMode: BeneficiaryMode.UPLINE_CHAIN,
					idFixedBeneficiaryUser: null,
					fixedBeneficiaryUser: null,
				},
			},
		] as never)

		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idUser: 1,
			idCategoria: 1,
			idUserLeader: null,
		} as never)

		// 1 SYNCHRONIZED remaining (the failed one was not processed)
		vi.mocked(prisma.settlementCommission.count).mockResolvedValue(1)

		const result = await procesarPreLiquidacion(1, {
			inicio: new Date('2024-01-01'),
			fin: new Date('2024-01-31'),
		})

		expect(result.success).toBe(true)
		expect(result.registrosProcesados).toBe(0)
		expect(result.registrosOmitidos).toBe(1)
		expect(prisma.comissionDistribution.create).not.toHaveBeenCalled()
		expect(prisma.settlementCommission.update).not.toHaveBeenCalled()
		// FileImport should NOT be advanced to PRE-SETTLED
		expect(prisma.fileImport.update).not.toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: 'PRE-SETTLED' }),
			})
		)
	})

	it('mixed: one success + one UPLINE_NO_MATCH — successful record PRE-SETTLED, failed stays SYNCHRONIZED, FileImport NOT advanced', async () => {
		// Reset mocks that use mockResolvedValueOnce to avoid queue leakage across tests
		vi.mocked(prisma.settlementCommission.findMany).mockReset()
		vi.mocked(prisma.productPercentageCommissionCategory.findMany).mockReset()
		vi.mocked(prisma.user.findUnique).mockReset()
		vi.mocked(prisma.comissionDistribution.create).mockReset()
		vi.mocked(prisma.settlementCommission.count).mockReset()

		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'LOAD',
			nameFile: 'Test.xlsx',
		} as never)

		// Two records: first succeeds (FIXED_BENEFICIARY), second fails (UPLINE_CHAIN no match)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([
			{
				idSettlementCommission: 500,
				status: 'SYNCHRONIZED',
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
				commissionValue: new Decimal(50000),
				baseCommission: new Decimal(50000),
				discountPercentage: new Decimal(0.1),
				clawbackPercentage: new Decimal(0),
				business: {
					idProductPercentageCommission: 10,
					user: { idUser: 1 },
				},
			},
			{
				idSettlementCommission: 501,
				status: 'SYNCHRONIZED',
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
				commissionValue: new Decimal(50000),
				baseCommission: new Decimal(50000),
				discountPercentage: new Decimal(0.1),
				clawbackPercentage: new Decimal(0),
				business: {
					idProductPercentageCommission: 20,
					user: { idUser: 2 },
				},
			},
		] as never)

		// PPC for record 500: FIXED_BENEFICIARY → resolves OK
		// PPC for record 501: UPLINE_CHAIN → no match
		vi.mocked(prisma.productPercentageCommissionCategory.findMany)
			.mockResolvedValueOnce([
				{
					id: 10,
					porcentajeDistribucion: new Decimal(1),
					porcentajePortfolio: null,
					category: {
						idCategory: 1,
						code: 'GENERAL',
						beneficiaryMode: BeneficiaryMode.FIXED_BENEFICIARY,
						idFixedBeneficiaryUser: 77,
						fixedBeneficiaryUser: { idUser: 77, active: true },
					},
				},
			] as never)
			.mockResolvedValueOnce([
				{
					id: 20,
					porcentajeDistribucion: new Decimal(1),
					porcentajePortfolio: null,
					category: {
						idCategory: 99,
						code: 'NOMATCH',
						beneficiaryMode: BeneficiaryMode.UPLINE_CHAIN,
						idFixedBeneficiaryUser: null,
						fixedBeneficiaryUser: null,
					},
				},
			] as never)

		// user.findUnique for chain of record 501 — no leader, no category match
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idUser: 2,
			idCategoria: 5, // doesn't match category 99
			idUserLeader: null,
		} as never)

		vi.mocked(prisma.comissionDistribution.create).mockResolvedValueOnce({
			idComissionDistribution: 500,
		} as any)

		// 1 remaining SYNCHRONIZED (record 501 was not processed)
		vi.mocked(prisma.settlementCommission.count).mockResolvedValue(1)

		const result = await procesarPreLiquidacion(1, {
			inicio: new Date('2024-01-01'),
			fin: new Date('2024-01-31'),
		})

		expect(result.success).toBe(true)
		expect(result.registrosProcesados).toBe(1)
		expect(result.registrosOmitidos).toBe(1)
		expect(result.registrosConError).toHaveLength(1)
		expect(result.registrosConError[0]).toMatchObject({
			idSettlementCommission: 501,
			categoryCode: 'NOMATCH',
			errorCode: 'UPLINE_NO_LEADER',
		})

		// Record 500 → PRE-SETTLED
		expect(prisma.settlementCommission.update).toHaveBeenCalledWith({
			where: { idSettlementCommission: 500 },
			data: { status: 'PRE-SETTLED' },
		})

		// FileImport should NOT be advanced to PRE-SETTLED (1 remaining SYNCHRONIZED)
		expect(prisma.fileImport.update).not.toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: 'PRE-SETTLED' }),
			})
		)
	})

	it('all succeed: FileImport updated to PRE-SETTLED; registrosConError is empty', async () => {
		// Reset to avoid queue leakage from prior tests
		vi.mocked(prisma.settlementCommission.findMany).mockReset()
		vi.mocked(prisma.productPercentageCommissionCategory.findMany).mockReset()
		vi.mocked(prisma.comissionDistribution.create).mockReset()
		vi.mocked(prisma.settlementCommission.count).mockReset()

		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'LOAD',
			nameFile: 'Test.xlsx',
		} as never)

		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([
			{
				idSettlementCommission: 600,
				status: 'SYNCHRONIZED',
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
				commissionValue: new Decimal(80000),
				baseCommission: new Decimal(80000),
				discountPercentage: new Decimal(0.1),
				clawbackPercentage: new Decimal(0),
				business: {
					idProductPercentageCommission: 30,
					user: { idUser: 10 },
				},
			},
		] as never)

		vi.mocked(prisma.productPercentageCommissionCategory.findMany).mockResolvedValue([
			{
				id: 30,
				porcentajeDistribucion: new Decimal(1),
				porcentajePortfolio: null,
				category: {
					idCategory: 1,
					code: 'AGENCIA',
					beneficiaryMode: BeneficiaryMode.FIXED_BENEFICIARY,
					idFixedBeneficiaryUser: 50,
					fixedBeneficiaryUser: { idUser: 50, active: true },
				},
			},
		] as never)

		vi.mocked(prisma.comissionDistribution.create).mockResolvedValueOnce({
			idComissionDistribution: 600,
		} as any)

		// 0 remaining SYNCHRONIZED → FileImport advances to PRE-SETTLED
		vi.mocked(prisma.settlementCommission.count).mockResolvedValue(0)

		const result = await procesarPreLiquidacion(1, {
			inicio: new Date('2024-01-01'),
			fin: new Date('2024-01-31'),
		})

		expect(result.success).toBe(true)
		expect(result.registrosProcesados).toBe(1)
		expect(result.registrosConError).toEqual([])

		// FileImport must be advanced to PRE-SETTLED
		expect(prisma.fileImport.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idFileImport: 1 },
				data: expect.objectContaining({ status: 'PRE-SETTLED' }),
			})
		)
	})
})

describe('obtenerRegistrosParaLiquidacion', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.settlementCommission.findMany).mockReset()
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

function mockCommissionRow(id: number, idBusiness: number | null = 1) {
	return {
		idSettlementCommission: id,
		idBusiness,
		commissionType: 'VOLUNTARIA',
		originCommission: null,
		isClawback: false,
	}
}

describe('liquidarRegistros', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 0,
		})
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 0 })
	})

	it('updates only PRE-SETTLED ids and returns liquidated count', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			mockCommissionRow(1),
			mockCommissionRow(2),
			mockCommissionRow(3),
		] as any)
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 3,
		})
		mockFileQueueCounts(0, 0)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		const result = await liquidarRegistros([1, 2, 3], 10, 1)
		expect(result.liquidated).toBe(3)
		expect(result.fileCompleted).toBe(true)
		expect(prisma.settlementCommission.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					idSettlementCommission: { in: [1, 2, 3] },
					status: 'PRE-SETTLED',
				},
			})
		)
		expect(prisma.settlementCommission.updateMany).toHaveBeenCalledWith({
			where: { idSettlementCommission: { in: [1, 2, 3] } },
			data: {
				status: 'SETTLED',
				settledDate: expect.any(Date),
				updatedAt: expect.any(Date),
			},
		})
		expect(prisma.settlementCommission.count).toHaveBeenCalledWith({
			where: { idFileImport: 1, status: 'SYNCHRONIZED' },
		})
		expect(prisma.settlementCommission.count).toHaveBeenCalledWith({
			where: { idFileImport: 1, status: 'PRE-SETTLED' },
		})
	})

	it('sets FileImport COMPLETED when 0 SYNCHRONIZED and 0 PRE-SETTLED remain', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			mockCommissionRow(1),
			mockCommissionRow(2),
			mockCommissionRow(3),
			mockCommissionRow(4),
			mockCommissionRow(5),
		] as any)
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 5,
		})
		mockFileQueueCounts(0, 0)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		await liquidarRegistros([1, 2, 3, 4, 5], 10, 1)
		expect(prisma.fileImport.update).toHaveBeenCalledWith({
			where: { idFileImport: 1 },
			data: { status: 'COMPLETED', updatedAt: expect.any(Date) },
		})
	})

	it('does not set FileImport COMPLETED when SYNCHRONIZED rows still exist', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			mockCommissionRow(1),
			mockCommissionRow(2),
			mockCommissionRow(3),
		] as any)
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 3,
		})
		mockFileQueueCounts(7, 0)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		const result = await liquidarRegistros([1, 2, 3], 10, 1)
		expect(result.fileCompleted).toBe(false)
		expect(result.liquidated).toBe(3)
		expect(prisma.fileImport.update).not.toHaveBeenCalled()
	})

	it('skips ids not in PRE-SETTLED and returns actual liquidated count', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			mockCommissionRow(1),
		] as any)
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		mockFileQueueCounts(4, 0)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		const result = await liquidarRegistros([1, 2], 10, 1)
		expect(result.liquidated).toBe(1)
		expect(result.fileCompleted).toBe(false)
	})

	it('does not set FileImport COMPLETED when 0 SYNCHRONIZED but PRE-SETTLED remain', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			mockCommissionRow(1),
		] as any)
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		mockFileQueueCounts(0, 3)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		const result = await liquidarRegistros([1], 10, 1)
		expect(result.fileCompleted).toBe(false)
		expect(prisma.fileImport.update).not.toHaveBeenCalled()
	})
})

describe('rezagarRegistros', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('updates only PRE-SETTLED ids to LAG and returns fileCompleted: false if records remain', async () => {
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 2,
		})
		mockFileQueueCounts(1, 0) // Some records still SYNCHRONIZED

		const result = await rezagarRegistros([4, 5], 10, 1)
		expect(result.lagged).toBe(2)
		expect(result.fileCompleted).toBe(false)
		expect(prisma.settlementCommission.updateMany).toHaveBeenCalledWith({
			where: {
				idSettlementCommission: { in: [4, 5] },
				status: 'PRE-SETTLED',
			},
			data: {
				status: 'LAG',
				isLag: true,
				lagDate: expect.any(Date),
				isLagByUser: true,
				isLagByUserDate: expect.any(Date),
				updatedAt: expect.any(Date),
			},
		})
		expect(prisma.fileImport.update).not.toHaveBeenCalled()
	})

	it('sets FileImport as COMPLETED when lagging last records and returns fileCompleted: true', async () => {
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 3,
		})
		mockFileQueueCounts(0, 0) // No records left
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		const result = await rezagarRegistros([1, 2, 3], 10, 1)
		expect(result.lagged).toBe(3)
		expect(result.fileCompleted).toBe(true)
		expect(prisma.fileImport.update).toHaveBeenCalledWith({
			where: { idFileImport: 1 },
			data: { status: 'COMPLETED', updatedAt: expect.any(Date) },
		})
	})
})
