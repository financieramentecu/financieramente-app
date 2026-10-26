import { describe, expect, it, vi } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { COM92_PREMIUM_CORRECTION } from '@/features/negocios/lib/com-92-premium-correction'

vi.mock('@/features/auth/lib/audit-logger', () => ({
	AuditAction: {
		BUSINESS_VALUE_CORRECTED: 'BUSINESS_VALUE_CORRECTED',
	},
}))

import {
	Com92CorrectionError,
	runCom92PremiumCorrection,
} from '../correct-com-92-premium.service'

function businessRow(value: string) {
	return {
		idBusiness: COM92_PREMIUM_CORRECTION.businessId,
		contract: COM92_PREMIUM_CORRECTION.contract,
		status: COM92_PREMIUM_CORRECTION.status,
		value: new Decimal(value),
		idClient: 9,
		idUser: 4,
		idCurrency: 2,
		idProductPercentageCommission: 7,
		client: { name: 'Angela', lastName: 'Oliva' },
		currency: { symbol: 'USD' },
		productPercentageCommission: {
			productConfiguration: {
				product: {
					name: 'EXECUTIVE 20',
					company: { name: 'TRINITY' },
				},
			},
		},
	}
}

function buildDb(value: string = COM92_PREMIUM_CORRECTION.previousValue) {
	const updateMany = vi.fn().mockResolvedValue({ count: 1 })
	const auditLogCreate = vi.fn().mockResolvedValue({})
	const db = {
		business: {
			findUnique: vi.fn().mockResolvedValue(businessRow(value)),
			updateMany,
		},
		settlementCommission: {
			findMany: vi.fn().mockResolvedValue([
				{
					idSettlementCommission: 10,
					status: 'SYNCHRONIZED',
					commissionValue: new Decimal('100.00'),
					baseCommission: new Decimal('100.00'),
					settledDate: null,
					contract: COM92_PREMIUM_CORRECTION.contract,
					comissionDistributions: [
						{ valueComissionFinal: new Decimal('80.00') },
					],
				},
			]),
		},
		user: {
			findUnique: vi.fn().mockResolvedValue({ idUser: 3, idRole: 1 }),
		},
		$transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) =>
			callback({
				business: { updateMany },
				auditLog: { create: auditLogCreate },
			})
		),
	}
	return { db, updateMany, auditLogCreate }
}

describe('runCom92PremiumCorrection', () => {
	it('does not write on dry-run when the row is ready', async () => {
		const { db, updateMany, auditLogCreate } = buildDb()

		const result = await runCom92PremiumCorrection(db as never, {
			apply: false,
		})

		expect(result.applied).toBe(false)
		expect(result.assessment.outcome).toBe('ready')
		expect(result.assessment.commissionImpact.willModify).toBe(false)
		expect(result.assessment.commissionImpact.linkedCount).toBe(1)
		expect(db.$transaction).not.toHaveBeenCalled()
		expect(updateMany).not.toHaveBeenCalled()
		expect(auditLogCreate).not.toHaveBeenCalled()
	})

	it('updates only the premium and writes the audit entry', async () => {
		const { db, updateMany, auditLogCreate } = buildDb()

		const result = await runCom92PremiumCorrection(db as never, {
			apply: true,
			operatorEmail: 'ops@financieramente.co',
		})

		expect(result.applied).toBe(true)
		expect(updateMany).toHaveBeenCalledWith({
			where: {
				idBusiness: 458,
				contract: '183785CA',
				status: 'FONDEADO',
				value: new Decimal('472576.00'),
			},
			data: { value: new Decimal('4725.76') },
		})
		expect(auditLogCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					action: 'BUSINESS_VALUE_CORRECTED',
					email: 'ops@financieramente.co',
					idUser: 3,
				}),
			})
		)
		const details = JSON.parse(
			auditLogCreate.mock.calls[0]?.[0].data.details as string
		) as {
			commissionsAdjusted: boolean
			previousValue: string
			newValue: string
		}
		expect(details.previousValue).toBe('472576.00')
		expect(details.newValue).toBe('4725.76')
		expect(details.commissionsAdjusted).toBe(false)
	})

	it('does not write when identity guards reject the row', async () => {
		const { db, updateMany } = buildDb()
		db.business.findUnique.mockResolvedValue({
			...businessRow(COM92_PREMIUM_CORRECTION.previousValue),
			contract: 'OTHER',
		})

		const result = await runCom92PremiumCorrection(db as never, {
			apply: true,
			operatorEmail: 'ops@financieramente.co',
		})

		expect(result.applied).toBe(false)
		expect(result.assessment.outcome).toBe('rejected')
		expect(updateMany).not.toHaveBeenCalled()
		expect(db.$transaction).not.toHaveBeenCalled()
	})

	it('does not write a second audit when the premium is already corrected', async () => {
		const { db, updateMany, auditLogCreate } = buildDb(
			COM92_PREMIUM_CORRECTION.correctedValue
		)

		const result = await runCom92PremiumCorrection(db as never, {
			apply: true,
			operatorEmail: 'ops@financieramente.co',
		})

		expect(result.assessment.outcome).toBe('already_corrected')
		expect(result.applied).toBe(false)
		expect(updateMany).not.toHaveBeenCalled()
		expect(auditLogCreate).not.toHaveBeenCalled()
	})

	it('refuses to apply without an operator email', async () => {
		const { db, updateMany } = buildDb()

		const result = await runCom92PremiumCorrection(db as never, { apply: true })

		expect(result.applied).toBe(false)
		expect(result.applyBlocker).toBe('operator_required')
		expect(updateMany).not.toHaveBeenCalled()
	})

	it('rolls back when the conditional update matches zero rows', async () => {
		const { db, auditLogCreate, updateMany } = buildDb()
		updateMany.mockResolvedValue({ count: 0 })

		await expect(
			runCom92PremiumCorrection(db as never, {
				apply: true,
				operatorEmail: 'ops@financieramente.co',
			})
		).rejects.toBeInstanceOf(Com92CorrectionError)
		expect(auditLogCreate).not.toHaveBeenCalled()
	})
})
