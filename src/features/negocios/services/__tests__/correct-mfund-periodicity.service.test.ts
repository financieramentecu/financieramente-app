import { describe, expect, it, vi } from 'vitest'
import { AuditAction } from '@/features/auth/lib/audit-logger'
import {
	applyMfundPeriodicityCorrection,
	findMfundPeriodicityMismatches,
} from '../correct-mfund-periodicity.service'

const mismatch = {
	idBusiness: 88,
	contract: 'MF-1',
	status: 'FONDEADO',
	buyPeriodicity: { name: 'Mensual' },
	_count: { settlementCommissions: 2 },
}

function dbWith(rows: unknown[]) {
	const updateMany = vi.fn().mockResolvedValue({ count: 1 })
	const auditCreate = vi.fn().mockResolvedValue({})
	const business = {
		findMany: vi.fn().mockResolvedValue(rows),
		updateMany,
	}
	return {
		business,
		buyPeriodicity: {
			findFirst: vi.fn().mockResolvedValue({ idBuyPeriodicity: 5 }),
		},
		user: {
			findUnique: vi.fn().mockResolvedValue({
				idUser: 9,
				idRole: 1,
				active: true,
				role: { code: 'ADMIN' },
			}),
		},
		$transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) =>
			callback({
				business,
				auditLog: { create: auditCreate },
			})
		),
		updateMany,
		auditCreate,
	}
}

describe('findMfundPeriodicityMismatches', () => {
	it('lists id, contract, status, current periodicity and linked settlements', async () => {
		const db = dbWith([mismatch])

		const rows = await findMfundPeriodicityMismatches(db as never)

		expect(rows).toEqual([
			{
				idBusiness: 88,
				contract: 'MF-1',
				status: 'FONDEADO',
				periodicityName: 'Mensual',
				settlementCount: 2,
			},
		])
		expect(db.business.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					AND: expect.arrayContaining([
						expect.objectContaining({
							productPercentageCommission: expect.anything(),
						}),
					]),
				}),
			})
		)
	})
})

describe('applyMfundPeriodicityCorrection', () => {
	it('updates only the periodicity and writes the previous and new values', async () => {
		const db = dbWith([mismatch])

		const summary = await applyMfundPeriodicityCorrection(
			db as never,
			'ops@financieramente.co'
		)

		expect(summary.updated).toBe(1)
		expect(summary.financialAmountsChanged).toBe(false)
		expect(summary.settlementsModified).toBe(false)
		expect(db.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ idBusiness: 88 }),
				data: { idBuyPeriodicity: 5 },
			})
		)
		expect(db.auditCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					action: AuditAction.BUSINESS_PERIODICITY_CORRECTED,
					email: 'ops@financieramente.co',
					idUser: 9,
					details: expect.stringContaining('Mensual → Aportes Ocasionales'),
				}),
			})
		)
	})

	it('refuses to write without an operator', async () => {
		const db = dbWith([mismatch])

		await expect(
			applyMfundPeriodicityCorrection(db as never, '   ')
		).rejects.toThrow('operator_required')
		expect(db.$transaction).not.toHaveBeenCalled()
	})

	it('refuses a nonexistent operator before any write', async () => {
		const db = dbWith([mismatch])
		db.user.findUnique.mockResolvedValue(null)

		await expect(
			applyMfundPeriodicityCorrection(db as never, 'nobody@financieramente.co')
		).rejects.toThrow('operator_not_found')
		expect(db.$transaction).not.toHaveBeenCalled()
		expect(db.updateMany).not.toHaveBeenCalled()
	})

	it('refuses an inactive or unauthorized operator before any write', async () => {
		const db = dbWith([mismatch])
		db.user.findUnique.mockResolvedValue({
			idUser: 9,
			idRole: 1,
			active: false,
			role: { code: 'ADMIN' },
		})

		await expect(
			applyMfundPeriodicityCorrection(db as never, 'ops@financieramente.co')
		).rejects.toThrow('operator_inactive')
		expect(db.$transaction).not.toHaveBeenCalled()
	})

	it('refuses an operator without write authority before any write', async () => {
		const db = dbWith([mismatch])
		db.user.findUnique.mockResolvedValue({
			idUser: 9,
			idRole: 1,
			active: true,
			role: { code: 'AGENTE' },
		})

		await expect(
			applyMfundPeriodicityCorrection(db as never, 'agent@financieramente.co')
		).rejects.toThrow('operator_forbidden')
		expect(db.$transaction).not.toHaveBeenCalled()
	})

	it('rolls back when the row no longer matches SKANDIA MFUND', async () => {
		const db = dbWith([mismatch])
		db.updateMany.mockResolvedValue({ count: 0 })

		await expect(
			applyMfundPeriodicityCorrection(db as never, 'ops@financieramente.co')
		).rejects.toThrow('periodicity_not_updated:88')
		expect(db.auditCreate).not.toHaveBeenCalled()
	})
})
