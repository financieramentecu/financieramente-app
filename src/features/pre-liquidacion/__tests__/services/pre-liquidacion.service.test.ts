/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
	liquidarRegistros,
	rezagarRegistros,
} from '../../services/pre-liquidacion.service'
import { Decimal } from '@prisma/client/runtime/library'

vi.mock('@/features/email/lib/preliquidacion-resumen-notification', () => ({
	sendResumenPreliquidacionEmail: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock Prisma following the project pattern from recalcularComisionesPorCambioOrigen.test.ts
vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: vi.fn(async (cb: any) => cb(prisma)),
		settlementCommission: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
			count: vi.fn(),
		},
		comissionDistribution: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
		clawback: {
			update: vi.fn(),
		},
		clawbackBalance: {
			upsert: vi.fn(),
		},
		business: {
			updateMany: vi.fn(),
		},
		fileImport: {
			update: vi.fn(),
		},
	},
}))

/** Stub `settlementCommission.count` for Liquidar file gate (SYNCHRONIZED then PRE-SETTLED). */
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

// ---------------------------------------------------------------------------
// Task 5.5: rezagarRegistros — sets isLagByUser, isLagByUserDate, status=LAG
// ---------------------------------------------------------------------------

describe('rezagarRegistros', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('updates records with isLagByUser=true and isLagByUserDate when status=PRE-SETTLED', async () => {
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 3,
		})

		const result = await rezagarRegistros([1, 2, 3], 10)

		expect(prisma.settlementCommission.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					idSettlementCommission: { in: [1, 2, 3] },
					status: 'PRE-SETTLED',
				},
				data: expect.objectContaining({
					status: 'LAG',
					isLag: true,
					isLagByUser: true,
					isLagByUserDate: expect.any(Date),
					lagDate: expect.any(Date),
					updatedAt: expect.any(Date),
				}),
			})
		)

		expect(result).toEqual({ lagged: 3 })
	})

	it('returns lagged=0 when no PRE-SETTLED records match', async () => {
		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 0,
		})

		const result = await rezagarRegistros([99], 10)

		expect(result).toEqual({ lagged: 0 })
	})
})

// ---------------------------------------------------------------------------
// Task 5.2: applyClawbacksForSettlement (via liquidarRegistros transaction)
// — POLIZA commissions update clawback appliedDate, append reason, upsert balance
// — Voluntaria commissions do NOT trigger clawback logic
// ---------------------------------------------------------------------------

describe('applyClawbacksForSettlement (via liquidarRegistros)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('updates clawback rows and upserts ClawbackBalance for POLIZA commissions with clawbacks', async () => {
		// Simulate a POLIZA_CLAW commission (commissionType=POLIZA, isClawback=true)
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 10,
				idBusiness: 1,
				commissionType: 'POLIZA',
				originCommission: null,
				isClawback: true,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})

		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})

		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([
			{
				idComissionDistribution: 100,
				idSettlementCommission: 10,
				clawback: {
					idClawback: 200,
					idUser: 5,
					reason: 'retención inicial',
					valueClawback: new Decimal(150),
				},
			},
		] as any)

		vi.mocked(prisma.clawback.update).mockResolvedValue({} as any)
		vi.mocked(prisma.clawbackBalance.upsert).mockResolvedValue({} as any)
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })
		mockFileQueueCounts(0, 0)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		await liquidarRegistros([10], 99, 1)

		// Clawback row should be updated with appliedDate and appended reason
		expect(prisma.clawback.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idClawback: 200 },
				data: expect.objectContaining({
					appliedDate: expect.any(Date),
					state: 'APPLIED',
					reason: 'retención inicial, retención del clawback de la póliza',
				}),
			})
		)

		// Balance should be upserted for user 5
		expect(prisma.clawbackBalance.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idUser: 5 },
				create: { idUser: 5, totalAmount: 150 },
				update: { totalAmount: { increment: 150 } },
			})
		)
	})

	it('appends reason correctly when clawback has no prior reason', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 11,
				idBusiness: 2,
				commissionType: 'POLIZA',
				originCommission: null,
				isClawback: true,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})

		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([
			{
				idComissionDistribution: 101,
				idSettlementCommission: 11,
				clawback: {
					idClawback: 201,
					idUser: 6,
					reason: null,
					valueClawback: new Decimal(80),
				},
			},
		] as any)

		vi.mocked(prisma.clawback.update).mockResolvedValue({} as any)
		vi.mocked(prisma.clawbackBalance.upsert).mockResolvedValue({} as any)
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })
		mockFileQueueCounts(1, 0)

		await liquidarRegistros([11], 99, 1)

		expect(prisma.clawback.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					reason: 'retención del clawback de la póliza',
				}),
			})
		)
	})

	it('does NOT update clawback when POLIZA commission has no clawback rows', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 12,
				idBusiness: 3,
				commissionType: 'POLIZA',
				originCommission: null,
				isClawback: true,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})

		// No distributions with clawbacks
		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([])
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })
		mockFileQueueCounts(1, 0)

		await liquidarRegistros([12], 99, 1)

		expect(prisma.clawback.update).not.toHaveBeenCalled()
		expect(prisma.clawbackBalance.upsert).not.toHaveBeenCalled()
	})

	it('does NOT call clawback logic for VOLUNTARIA commissions', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 13,
				idBusiness: 4,
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })
		mockFileQueueCounts(1, 0)

		await liquidarRegistros([13], 99, 1)

		// For VOLUNTARIA, findMany for distributions should NOT be called
		expect(prisma.comissionDistribution.findMany).not.toHaveBeenCalled()
		expect(prisma.clawback.update).not.toHaveBeenCalled()
	})
})

// ---------------------------------------------------------------------------
// Task 5.3: updateBusinessStatusOnSettle (via liquidarRegistros transaction)
// — only EMITIDO businesses transition to COMISIONANDO
// — non-EMITIDO businesses remain unchanged (filter applied in WHERE clause)
// ---------------------------------------------------------------------------

describe('updateBusinessStatusOnSettle (via liquidarRegistros)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('calls updateMany with status=EMITIDO filter so only EMITIDO businesses transition to COMISIONANDO', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 20,
				idBusiness: 10,
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })
		mockFileQueueCounts(1, 0)

		await liquidarRegistros([20], 99, 1)

		expect(prisma.business.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					idBusiness: { in: [10] },
					status: 'EMITIDO',
				},
				data: expect.objectContaining({
					status: 'COMISIONANDO',
				}),
			})
		)
	})

	it('does not call business.updateMany when no business ids are present', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 21,
				idBusiness: null,
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})
		mockFileQueueCounts(1, 0)

		await liquidarRegistros([21], 99, 1)

		expect(prisma.business.updateMany).not.toHaveBeenCalled()
	})
})

// ---------------------------------------------------------------------------
// Task 5.4: liquidarRegistros — full transaction scenarios
// — Voluntaria: settles commission + distribution, no clawback changes
// — File transitions to COMPLETED when no SYNCHRONIZED remain for the file
// — Returns liquidated count and fileCompleted flag
// ---------------------------------------------------------------------------

describe('liquidarRegistros', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('settles commission and distributions for VOLUNTARIA commission', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 30,
				idBusiness: 20,
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })
		mockFileQueueCounts(2, 0)

		const result = await liquidarRegistros([30], 99, 5)

		// settlement_commission updated to SETTLED
		expect(prisma.settlementCommission.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idSettlementCommission: { in: [30] } },
				data: expect.objectContaining({ status: 'SETTLED', settledDate: expect.any(Date) }),
			})
		)

		// distributions updated to SETTLED
		expect(prisma.comissionDistribution.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idSettlementCommission: { in: [30] } },
				data: expect.objectContaining({ status: 'SETTLED' }),
			})
		)

		expect(result).toEqual({ liquidated: 1, fileCompleted: false })
	})

	it('transitions file to COMPLETED when no SYNCHRONIZED and no PRE-SETTLED remain', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 31,
				idBusiness: 21,
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })

		mockFileQueueCounts(0, 0)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		const result = await liquidarRegistros([31], 99, 7)

		expect(prisma.settlementCommission.count).toHaveBeenCalledWith({
			where: { idFileImport: 7, status: 'SYNCHRONIZED' },
		})
		expect(prisma.settlementCommission.count).toHaveBeenCalledWith({
			where: { idFileImport: 7, status: 'PRE-SETTLED' },
		})
		expect(prisma.fileImport.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idFileImport: 7 },
				data: expect.objectContaining({ status: 'COMPLETED' }),
			})
		)

		expect(result).toEqual({ liquidated: 1, fileCompleted: true })
	})

	it('does NOT complete file when SYNCHRONIZED commissions still exist for the file', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 32,
				idBusiness: 22,
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })

		mockFileQueueCounts(3, 0)

		const result = await liquidarRegistros([32], 99, 7)

		expect(prisma.fileImport.update).not.toHaveBeenCalled()
		expect(result).toEqual({ liquidated: 1, fileCompleted: false })
	})

	it('does NOT complete file when SYNCHRONIZED=0 but PRE-SETTLED rows remain', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 33,
				idBusiness: 23,
				commissionType: 'VOLUNTARIA',
				originCommission: null,
				isClawback: false,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })

		mockFileQueueCounts(0, 5)

		const result = await liquidarRegistros([33], 99, 7)

		expect(prisma.fileImport.update).not.toHaveBeenCalled()
		expect(result).toEqual({ liquidated: 1, fileCompleted: false })
	})

	it('returns liquidated=0 when no PRE-SETTLED records match the given ids', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])

		const result = await liquidarRegistros([99], 99, 7)

		expect(prisma.settlementCommission.updateMany).not.toHaveBeenCalled()
		expect(result).toEqual({ liquidated: 0, fileCompleted: false })
	})

	it('settles POLIZA commission, applies clawbacks, and updates business status', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{
				idSettlementCommission: 40,
				idBusiness: 30,
				commissionType: 'POLIZA',
				originCommission: null,
				isClawback: true,
			},
		] as any)

		vi.mocked(prisma.settlementCommission.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.updateMany).mockResolvedValue({
			count: 1,
		})
		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([
			{
				idComissionDistribution: 200,
				idSettlementCommission: 40,
				clawback: {
					idClawback: 300,
					idUser: 7,
					reason: 'poliza clawback',
					valueClawback: new Decimal(200),
				},
			},
		] as any)

		vi.mocked(prisma.clawback.update).mockResolvedValue({} as any)
		vi.mocked(prisma.clawbackBalance.upsert).mockResolvedValue({} as any)
		vi.mocked(prisma.business.updateMany).mockResolvedValue({ count: 1 })
		mockFileQueueCounts(0, 0)
		vi.mocked(prisma.fileImport.update).mockResolvedValue({} as any)

		const result = await liquidarRegistros([40], 99, 3)

		// Clawback applied
		expect(prisma.clawback.update).toHaveBeenCalled()
		expect(prisma.clawbackBalance.upsert).toHaveBeenCalled()

		// Business status updated
		expect(prisma.business.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: 'EMITIDO' }),
				data: expect.objectContaining({ status: 'COMISIONANDO' }),
			})
		)

		expect(result).toEqual({ liquidated: 1, fileCompleted: true })
	})
})
