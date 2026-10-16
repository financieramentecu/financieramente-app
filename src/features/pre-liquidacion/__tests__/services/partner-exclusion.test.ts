/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	obtenerDetallePreLiquidacion,
	procesarPreLiquidacion,
	liquidarArchivoCompleto,
	liquidarRegistros,
	obtenerArchivosDisponiblesPreliquidacion,
	obtenerComisionesPreliquidadas,
	obtenerRegistrosParaLiquidacion,
	sincronizarYCalcularRegistroRezagado,
	recalcularComisionesPorCambioOrigen,
} from '../../services/pre-liquidacion.service'
import { prisma } from '@/lib/prisma'
import { BeneficiaryMode } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

vi.mock('@/features/email/lib/preliquidacion-resumen-notification', () => ({
	sendResumenPreliquidacionEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		fileImport: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
		settlementCommission: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
			count: vi.fn(),
			groupBy: vi.fn(),
		},
		productPercentageCommissionCategory: { findMany: vi.fn() },
		productConfiguration: { findFirst: vi.fn() },
		comissionDistribution: {
			create: vi.fn(),
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
		distributionApproval: { groupBy: vi.fn() },
		clawback: { create: vi.fn(), deleteMany: vi.fn() },
		clawbackBalance: { upsert: vi.fn() },
		business: {
			updateMany: vi.fn(),
			findFirst: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		user: { findUnique: vi.fn() },
		auditLog: { create: vi.fn() },
		commissionDiscount: { findMany: vi.fn() },
		$transaction: vi.fn((callback) => callback(prisma)),
	},
}))

const RANGE = { inicio: new Date('2024-01-01'), fin: new Date('2024-01-31') }

const partnerBusiness = (extra: Record<string, unknown> = {}) => ({
	idBusiness: 70,
	contract: 'CTO-P',
	idProductPercentageCommission: 900,
	user: { idUser: 22 },
	productPercentageCommission: {
		productConfiguration: { level: { code: 'PARTNER_EXTERNAL' } },
	},
	...extra,
})

const agentBusiness = (extra: Record<string, unknown> = {}) => ({
	idBusiness: 60,
	contract: 'CTO-A',
	idProductPercentageCommission: 50,
	user: { idUser: 10 },
	productPercentageCommission: {
		productConfiguration: { level: { code: 'LEVEL_0' } },
	},
	...extra,
})

const syncRow = (id: number, business: unknown) => ({
	idSettlementCommission: id,
	status: 'SYNCHRONIZED',
	commissionType: 'VOLUNTARIA',
	originCommission: null,
	isClawback: false,
	commissionValue: new Decimal(100000),
	baseCommission: new Decimal(100000),
	discountPercentage: new Decimal(0.1),
	clawbackPercentage: new Decimal(0),
	business,
})

const generalCategory = {
	id: 10,
	porcentajeDistribucion: new Decimal(1),
	porcentajePortfolio: null,
	level: {
		idLevel: 1,
		code: 'GENERAL_LEVEL',
		beneficiaryMode: BeneficiaryMode.BENEFICIARIO_GENERAL,
		idFixedBeneficiaryUser: 77,
		fixedBeneficiaryUser: { idUser: 77, active: true },
	},
}

/** Counts keyed by settlement status; unknown statuses count 0. */
function mockCounts(byStatus: Record<string, number>) {
	vi.mocked(prisma.settlementCommission.count).mockImplementation(((
		args: any
	) => Promise.resolve(byStatus[args?.where?.status] ?? 0)) as any)
}

beforeEach(() => {
	vi.resetAllMocks()
	vi.mocked(prisma.$transaction).mockImplementation(((cb: any) =>
		cb(prisma)) as any)
	vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
		idFileImport: 1,
		status: 'LOAD',
		nameFile: 'Test.xlsx',
	} as any)
	vi.mocked(prisma.comissionDistribution.create).mockResolvedValue({
		idComissionDistribution: 1,
	} as any)
})

const excludedUpdates = () =>
	vi
		.mocked(prisma.settlementCommission.update)
		.mock.calls.filter(([a]) => (a as any).data?.status === 'EXCLUDED')

describe('procesarPreLiquidacion - partner rows (PL-01, PL-02, PL-03)', () => {
	it('converts a SYNCHRONIZED partner row to EXCLUDED: no distribution, no throw', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([
			syncRow(1, partnerBusiness()),
		] as any)
		// partner PPC has no active category lines
		vi.mocked(
			prisma.productPercentageCommissionCategory.findMany
		).mockResolvedValue([])
		mockCounts({ SYNCHRONIZED: 0 })

		const result = await procesarPreLiquidacion(1, RANGE)

		expect(result.success).toBe(true)
		expect(result.registrosProcesados).toBe(0)
		expect(result.registrosExcluidos).toBe(1)
		expect(excludedUpdates()).toHaveLength(1)
		expect(prisma.settlementCommission.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idSettlementCommission: 1 } })
		)
		expect(prisma.comissionDistribution.create).not.toHaveBeenCalled()
		expect(prisma.clawback.create).not.toHaveBeenCalled()
	})

	it('decides by PPC level even if the category lines exist (no distribution created)', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([
			syncRow(1, partnerBusiness()),
		] as any)
		vi.mocked(
			prisma.productPercentageCommissionCategory.findMany
		).mockResolvedValue([generalCategory] as any)
		mockCounts({ SYNCHRONIZED: 0 })

		await procesarPreLiquidacion(1, RANGE)

		expect(prisma.comissionDistribution.create).not.toHaveBeenCalled()
		expect(excludedUpdates()).toHaveLength(1)
	})

	it('mixed file: only the agent row is distributed and the file reaches PRE-SETTLED', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([
			syncRow(1, partnerBusiness()),
			syncRow(2, agentBusiness()),
		] as any)
		vi.mocked(
			prisma.productPercentageCommissionCategory.findMany
		).mockResolvedValue([generalCategory] as any)
		mockCounts({ SYNCHRONIZED: 0 })

		const result = await procesarPreLiquidacion(1, RANGE)

		expect(result).toMatchObject({
			success: true,
			registrosProcesados: 1,
			registrosExcluidos: 1,
		})
		const distributedSettlements = vi
			.mocked(prisma.comissionDistribution.create)
			.mock.calls.map(([a]) => (a as any).data.idSettlementCommission)
		expect(distributedSettlements).toEqual([2])
		expect(prisma.settlementCommission.update).toHaveBeenCalledWith({
			where: { idSettlementCommission: 2 },
			data: { status: 'PRE-SETTLED' },
		})
		expect(prisma.fileImport.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: 'PRE-SETTLED' }),
			})
		)
	})

	it('non-partner business with an empty PPC keeps today behavior (skipped, stays SYNCHRONIZED, file not advanced)', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([
			syncRow(2, agentBusiness()),
		] as any)
		vi.mocked(
			prisma.productPercentageCommissionCategory.findMany
		).mockResolvedValue([])
		mockCounts({ SYNCHRONIZED: 1 })

		const result = await procesarPreLiquidacion(1, RANGE)

		expect(result.registrosProcesados).toBe(0)
		expect(result.registrosExcluidos ?? 0).toBe(0)
		expect(excludedUpdates()).toHaveLength(0)
		expect(prisma.fileImport.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.not.objectContaining({ status: 'PRE-SETTLED' }),
			})
		)
	})

	it('partner-only file (no SYNCHRONIZED rows at all) reaches PRE-SETTLED without error', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([])
		mockCounts({ SYNCHRONIZED: 0, EXCLUDED: 3 })

		const result = await procesarPreLiquidacion(1, RANGE)

		expect(result.success).toBe(true)
		expect(result.registrosProcesados).toBe(0)
		expect(result.registrosExcluidos).toBe(3)
		expect(result.mensaje).toMatch(/partner/i)
		expect(prisma.fileImport.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idFileImport: 1 },
				data: expect.objectContaining({
					status: 'PRE-SETTLED',
					preLiquidacionDate: expect.any(Date),
				}),
			})
		)
		expect(prisma.comissionDistribution.create).not.toHaveBeenCalled()
	})

	it('no rows in range, SYNCHRONIZED rows outside the range remain: keeps the original error', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([])
		mockCounts({ SYNCHRONIZED: 4, EXCLUDED: 3 })

		const result = await procesarPreLiquidacion(1, RANGE)

		expect(result.success).toBe(false)
		expect(result.mensaje).toMatch(/No hay registros sincronizados/)
		expect(prisma.fileImport.update).not.toHaveBeenCalled()
	})

	it('empty file with neither SYNCHRONIZED nor EXCLUDED rows keeps the original error', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([])
		mockCounts({})

		const result = await procesarPreLiquidacion(1, RANGE)

		expect(result.success).toBe(false)
		expect(prisma.fileImport.update).not.toHaveBeenCalled()
	})
})

describe('listing of available files (PL-02)', () => {
	const file = {
		idFileImport: 5,
		nameFile: 'partners.xlsx',
		fileType: 'POLIZA',
		loadDate: new Date('2024-02-01'),
		preLiquidacionDate: null,
		totalRecord: 2,
		sincronizadoRecord: 0,
		rezagadoRecord: 0,
		status: 'LOAD',
		user: { name: 'A', lastName: 'B' },
	}

	it('includes EXCLUDED rows when deciding which files are listed', async () => {
		vi.mocked(prisma.fileImport.findMany).mockResolvedValue([])
		await obtenerArchivosDisponiblesPreliquidacion()
		const where = (
			vi.mocked(prisma.fileImport.findMany).mock.calls[0][0] as any
		).where
		expect(where.settlementCommissions.some.status.in).toContain('EXCLUDED')
		expect(where.settlementCommissions.some.status.in).toContain('SYNCHRONIZED')
	})

	it('a partner-only LOAD file is available to pre-liquidate and shows the excluded count', async () => {
		vi.mocked(prisma.fileImport.findMany).mockResolvedValue([file] as any)
		vi.mocked(prisma.settlementCommission.groupBy).mockResolvedValue([
			{
				idFileImport: 5,
				status: 'EXCLUDED',
				_count: { idSettlementCommission: 2 },
			},
		] as any)
		vi.mocked(prisma.distributionApproval.groupBy).mockResolvedValue([])
		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([])

		const res = await obtenerArchivosDisponiblesPreliquidacion()

		expect(res.archivos[0]).toMatchObject({
			idFileImport: 5,
			sincronizados: 0,
			registrosPreliquidados: 0,
			excluidos: 2,
		})
		expect(res.resumen.sincronizados).toBe(1)
		expect(res.resumen.preLiquidados).toBe(0)
	})

	it('EXCLUDED rows are not counted as sincronizados nor as pre-liquidated', async () => {
		vi.mocked(prisma.fileImport.findMany).mockResolvedValue([file] as any)
		vi.mocked(prisma.settlementCommission.groupBy).mockResolvedValue([
			{
				idFileImport: 5,
				status: 'SYNCHRONIZED',
				_count: { idSettlementCommission: 3 },
			},
			{
				idFileImport: 5,
				status: 'EXCLUDED',
				_count: { idSettlementCommission: 4 },
			},
		] as any)
		vi.mocked(prisma.distributionApproval.groupBy).mockResolvedValue([])
		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([])

		const res = await obtenerArchivosDisponiblesPreliquidacion()

		expect(res.archivos[0]).toMatchObject({
			sincronizados: 3,
			registrosPreliquidados: 0,
			excluidos: 4,
		})
	})

	it('a file without EXCLUDED rows and without sync rows is NOT made available', async () => {
		vi.mocked(prisma.fileImport.findMany).mockResolvedValue([file] as any)
		vi.mocked(prisma.settlementCommission.groupBy).mockResolvedValue([])
		vi.mocked(prisma.distributionApproval.groupBy).mockResolvedValue([])
		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([])

		const res = await obtenerArchivosDisponiblesPreliquidacion()

		expect(res.resumen.sincronizados).toBe(0)
	})
})

describe('detail listings ignore EXCLUDED rows', () => {
	it('obtenerRegistrosParaLiquidacion status filter does not include EXCLUDED', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'LOAD',
			loadDate: new Date('2024-02-01'),
			user: { name: 'A', lastName: 'B' },
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])
		await obtenerRegistrosParaLiquidacion(1)
		const where = (
			vi.mocked(prisma.settlementCommission.findMany).mock.calls[0][0] as any
		).where
		expect(where.status.in).toEqual([
			'SYNCHRONIZED',
			'PRE-SETTLED',
			'SETTLED',
			'LAG',
		])
	})

	it('obtenerComisionesPreliquidadas status filter does not include EXCLUDED', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'PRE-SETTLED',
			loadDate: new Date('2024-02-01'),
			user: { name: 'A', lastName: 'B' },
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])
		await obtenerComisionesPreliquidadas(1)
		const where = (
			vi.mocked(prisma.settlementCommission.findMany).mock.calls[0][0] as any
		).where
		expect(where.status.in).not.toContain('EXCLUDED')
	})
})

describe('obtenerDetallePreLiquidacion ignores EXCLUDED rows', () => {
	it('reads only SYNCHRONIZED rows', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 1,
			status: 'LOAD',
			loadDate: new Date('2024-02-01'),
			user: { name: 'A', lastName: 'B' },
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])
		await obtenerDetallePreLiquidacion(1)
		const where = (
			vi.mocked(prisma.settlementCommission.findMany).mock.calls[0][0] as any
		).where
		expect(where.status).toBe('SYNCHRONIZED')
	})
})

describe('liquidarRegistros with EXCLUDED rows (counters)', () => {
	it('EXCLUDED rows never block the file from reaching SETTLED and never flip business status', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 1,
				idBusiness: 60,
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
			},
		] as any)
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		} as any)
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 0,
		} as any)
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 } as any)
		// 5 EXCLUDED rows exist but SYNCHRONIZED and PRE-SETTLED are exhausted
		mockCounts({ SYNCHRONIZED: 0, 'PRE-SETTLED': 0, EXCLUDED: 5 })

		const result = await liquidarRegistros([1], 10, 1)

		expect(result.fileCompleted).toBe(true)
		const businessIds = (
			vi.mocked(prisma.business.updateMany).mock.calls[0][0] as any
		).where.idBusiness.in
		expect(businessIds).toEqual([60])
		// the settle query only targets PRE-SETTLED rows
		expect(
			(vi.mocked(prisma.settlementCommission.findMany).mock.calls[0][0] as any)
				.where.status
		).toBe('PRE-SETTLED')
	})
})

describe('liquidarArchivoCompleto - file with only EXCLUDED rows (6.6, PL-02)', () => {
	it('sets FileImport SETTLED (terminal) instead of failing', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 7,
			status: 'PRE-SETTLED',
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])
		mockCounts({ SYNCHRONIZED: 0, 'PRE-SETTLED': 0, EXCLUDED: 4 })

		const result = await liquidarArchivoCompleto(7, 10)

		expect(result).toMatchObject({ success: true, liquidados: 0 })
		expect(result.mensaje).toMatch(/partner/i)
		expect(prisma.fileImport.update).toHaveBeenCalledWith({
			where: { idFileImport: 7 },
			data: { status: 'SETTLED', updatedAt: expect.any(Date) },
		})
		expect(prisma.settlementCommission.updateMany).not.toHaveBeenCalled()
		expect(prisma.business.updateMany).not.toHaveBeenCalled()
	})

	it('a file with no PRE-SETTLED and no EXCLUDED rows keeps failing', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 7,
			status: 'PRE-SETTLED',
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])
		mockCounts({})

		const result = await liquidarArchivoCompleto(7, 10)

		expect(result.success).toBe(false)
		expect(prisma.fileImport.update).not.toHaveBeenCalled()
	})

	it('does not settle a file that still has SYNCHRONIZED rows', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 7,
			status: 'LOAD',
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])
		mockCounts({ SYNCHRONIZED: 2, EXCLUDED: 4 })

		const result = await liquidarArchivoCompleto(7, 10)

		expect(result.success).toBe(false)
		expect(prisma.fileImport.update).not.toHaveBeenCalled()
	})

	it('does not settle a file that is not PRE-SETTLED', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 7,
			status: 'LOAD',
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])
		mockCounts({ SYNCHRONIZED: 0, EXCLUDED: 4 })

		const result = await liquidarArchivoCompleto(7, 10)

		expect(result.success).toBe(false)
		expect(prisma.fileImport.update).not.toHaveBeenCalled()
	})

	it('mixed file: only PRE-SETTLED rows are settled, then the file is SETTLED', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 7,
			status: 'PRE-SETTLED',
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 2,
				idBusiness: 60,
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
			},
		] as any)
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		} as any)
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		} as any)
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 } as any)
		mockCounts({ SYNCHRONIZED: 0, 'PRE-SETTLED': 0, EXCLUDED: 1 })

		const result = await liquidarArchivoCompleto(7, 10)

		expect(result).toMatchObject({ success: true, liquidados: 1 })
		expect(prisma.fileImport.update).toHaveBeenCalledWith({
			where: { idFileImport: 7 },
			data: { status: 'SETTLED', updatedAt: expect.any(Date) },
		})
	})
})

describe('sincronizarYCalcularRegistroRezagado - partner business (PL-03)', () => {
	it('marks the LAG row as EXCLUDED, links the business, creates no distribution and does not throw', async () => {
		vi.mocked(prisma.business.findFirst).mockResolvedValue(
			partnerBusiness() as any
		)
		vi.mocked(prisma.settlementCommission.findUnique).mockResolvedValue({
			idSettlementCommission: 9,
			status: 'LAG',
		} as any)

		const result = await sincronizarYCalcularRegistroRezagado(9, 'CTO-P')

		expect(result.success).toBe(true)
		expect(result.mensaje).toMatch(/partner/i)
		expect(prisma.settlementCommission.update).toHaveBeenCalledWith({
			where: { idSettlementCommission: 9 },
			data: expect.objectContaining({
				status: 'EXCLUDED',
				idBusiness: 70,
				isLag: false,
			}),
		})
		expect(prisma.comissionDistribution.create).not.toHaveBeenCalled()
		expect(
			prisma.productPercentageCommissionCategory.findMany
		).not.toHaveBeenCalled()
	})

	it('a non-LAG row for a partner contract still fails the state precondition', async () => {
		vi.mocked(prisma.business.findFirst).mockResolvedValue(
			partnerBusiness() as any
		)
		vi.mocked(prisma.settlementCommission.findUnique).mockResolvedValue({
			idSettlementCommission: 9,
			status: 'PRE-SETTLED',
		} as any)

		const result = await sincronizarYCalcularRegistroRezagado(9, 'CTO-P')

		expect(result.success).toBe(false)
		expect(prisma.settlementCommission.update).not.toHaveBeenCalled()
	})

	it('a non-partner business with an empty PPC still reports the misconfiguration', async () => {
		vi.mocked(prisma.business.findFirst).mockResolvedValue(
			agentBusiness() as any
		)
		vi.mocked(prisma.settlementCommission.findUnique).mockResolvedValue({
			idSettlementCommission: 9,
			status: 'LAG',
			commissionType: 'VOLUNTARIA',
		} as any)
		vi.mocked(
			prisma.productPercentageCommissionCategory.findMany
		).mockResolvedValue([])

		const result = await sincronizarYCalcularRegistroRezagado(9, 'CTO-A')

		expect(result.success).toBe(false)
		expect(result.mensaje).toMatch(/configuración de porcentajes/)
	})
})

describe('recalcularComisionesPorCambioOrigen - partner business (PL-03)', () => {
	it('returns early for a partner business: no throw, no writes, no distribution', async () => {
		vi.mocked(prisma.business.findUnique).mockResolvedValue({
			idBusiness: 70,
			user: { idUser: 22 },
			productPercentageCommission: {
				productConfiguration: {
					idProduct: 1,
					idLevel: 99,
					level: { code: 'PARTNER_EXTERNAL' },
				},
			},
		} as any)

		const result = await recalcularComisionesPorCambioOrigen(70, 3, {
			idUser: 1,
			name: 'Admin',
		})

		expect(result).toMatchObject({ success: true, countRecreados: 0 })
		expect(prisma.business.update).not.toHaveBeenCalled()
		expect(prisma.productConfiguration.findFirst).not.toHaveBeenCalled()
		expect(prisma.comissionDistribution.create).not.toHaveBeenCalled()
		expect(prisma.settlementCommission.findMany).not.toHaveBeenCalled()
	})

	it('a non-partner business with no product configuration still throws', async () => {
		vi.mocked(prisma.business.findUnique).mockResolvedValue({
			idBusiness: 60,
			productPercentageCommission: {
				productConfiguration: {
					idProduct: 1,
					idLevel: 2,
					level: { code: 'LEVEL_0' },
				},
			},
		} as any)
		vi.mocked(prisma.productConfiguration.findFirst).mockResolvedValue(null)

		await expect(
			recalcularComisionesPorCambioOrigen(60, 3, { idUser: 1, name: 'Admin' })
		).rejects.toThrow(
			'No existe configuración de producto para el nuevo origen'
		)
	})
})

// ---------------------------------------------------------------------------
// Phase 9 / 9.4 [AUD]: excluded transitions are audited (real logAuditEvent,
// observed through the mocked prisma.auditLog.create)
// ---------------------------------------------------------------------------

const AUDIT_CTX = {
	userId: 5,
	email: 'admin@test.com',
	ipAddress: '10.0.0.1',
	userAgent: 'vitest',
}

const auditEvents = (action: string) =>
	vi
		.mocked(prisma.auditLog.create)
		.mock.calls.map(([a]) => (a as any).data)
		.filter((d) => d.action === action)

describe('audit of excluded transitions (9.4)', () => {
	beforeEach(() => {
		vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any)
	})

	it('procesarPreLiquidacion logs ONE SETTLEMENT_EXCLUDED event with the count for several partner rows', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([
			syncRow(1, partnerBusiness()),
			syncRow(2, partnerBusiness()),
			syncRow(3, partnerBusiness()),
		] as any)
		mockCounts({ SYNCHRONIZED: 0 })

		await procesarPreLiquidacion(1, RANGE, AUDIT_CTX)

		const events = auditEvents('SETTLEMENT_EXCLUDED')
		expect(events).toHaveLength(1)
		expect(events[0]).toMatchObject({
			idUser: 5,
			email: 'admin@test.com',
			ipAddress: '10.0.0.1',
			userAgent: 'vitest',
		})
		expect(JSON.parse(events[0].details)).toMatchObject({
			fileImportId: 1,
			source: 'PRE_LIQUIDACION',
			excludedCount: 3,
		})
	})

	it('procesarPreLiquidacion logs nothing for a file without partner rows', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([
			syncRow(2, agentBusiness()),
		] as any)
		vi.mocked(
			prisma.productPercentageCommissionCategory.findMany
		).mockResolvedValue([generalCategory] as any)
		mockCounts({ SYNCHRONIZED: 0 })

		await procesarPreLiquidacion(1, RANGE, AUDIT_CTX)

		expect(auditEvents('SETTLEMENT_EXCLUDED')).toHaveLength(0)
		expect(auditEvents('FILE_IMPORT_EXCLUDED_ONLY_CLOSED')).toHaveLength(0)
	})

	it('a partner-only file advanced to PRE-SETTLED logs FILE_IMPORT_EXCLUDED_ONLY_CLOSED', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([])
		mockCounts({ SYNCHRONIZED: 0, EXCLUDED: 3 })

		await procesarPreLiquidacion(1, RANGE, AUDIT_CTX)

		const events = auditEvents('FILE_IMPORT_EXCLUDED_ONLY_CLOSED')
		expect(events).toHaveLength(1)
		expect(events[0]).toMatchObject({ idUser: 5, email: 'admin@test.com' })
		expect(JSON.parse(events[0].details)).toMatchObject({
			fileImportId: 1,
			fromStatus: 'LOAD',
			toStatus: 'PRE-SETTLED',
			excludedCount: 3,
		})
	})

	it('liquidarArchivoCompleto logs FILE_IMPORT_EXCLUDED_ONLY_CLOSED (PRE-SETTLED -> SETTLED) with the user id', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 7,
			status: 'PRE-SETTLED',
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])
		mockCounts({ SYNCHRONIZED: 0, 'PRE-SETTLED': 0, EXCLUDED: 4 })

		await liquidarArchivoCompleto(7, 10, { userId: 10 })

		const events = auditEvents('FILE_IMPORT_EXCLUDED_ONLY_CLOSED')
		expect(events).toHaveLength(1)
		expect(events[0].idUser).toBe(10)
		expect(JSON.parse(events[0].details)).toMatchObject({
			fileImportId: 7,
			fromStatus: 'PRE-SETTLED',
			toStatus: 'SETTLED',
			excludedCount: 4,
		})
	})

	it('liquidarArchivoCompleto logs nothing when the file does not close as excluded-only', async () => {
		vi.mocked(prisma.fileImport.findUnique).mockResolvedValue({
			idFileImport: 7,
			status: 'LOAD',
		} as any)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])

		await liquidarArchivoCompleto(7, 10, { userId: 10 })

		expect(auditEvents('FILE_IMPORT_EXCLUDED_ONLY_CLOSED')).toHaveLength(0)
	})

	it('sincronizarYCalcularRegistroRezagado logs a SETTLEMENT_EXCLUDED event for the linked partner row', async () => {
		vi.mocked(prisma.business.findFirst).mockResolvedValue(
			partnerBusiness() as any
		)
		vi.mocked(prisma.settlementCommission.findUnique).mockResolvedValue({
			idSettlementCommission: 9,
			status: 'LAG',
		} as any)

		await sincronizarYCalcularRegistroRezagado(9, 'CTO-P', AUDIT_CTX)

		const events = auditEvents('SETTLEMENT_EXCLUDED')
		expect(events).toHaveLength(1)
		expect(events[0]).toMatchObject({ idUser: 5, email: 'admin@test.com' })
		expect(JSON.parse(events[0].details)).toMatchObject({
			idSettlementCommission: 9,
			idBusiness: 70,
			source: 'LAG_RECOVERY',
			excludedCount: 1,
		})
	})

	it('an audit failure never breaks the flow (logAuditEvent swallows it)', async () => {
		vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error('db down'))
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValueOnce([
			syncRow(1, partnerBusiness()),
		] as any)
		mockCounts({ SYNCHRONIZED: 0 })

		const result = await procesarPreLiquidacion(1, RANGE, AUDIT_CTX)

		expect(result).toMatchObject({ success: true, registrosExcluidos: 1 })
	})
})
