import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	findAffectedBusinesses,
	runRemediation,
} from '../remediate-unsupported-funded-businesses'

vi.mock('@/features/auth/lib/audit-logger', () => ({
	AuditAction: { BUSINESS_REMEDIATION_REVERTED: 'BUSINESS_REMEDIATION_REVERTED' },
}))

type MockPrisma = {
	business: {
		findMany: ReturnType<typeof vi.fn>
	}
	$transaction: ReturnType<typeof vi.fn>
}

function buildMockPrisma(): MockPrisma {
	return {
		business: { findMany: vi.fn() },
		$transaction: vi.fn(),
	}
}

const affectedBusiness = {
	idBusiness: 42,
	status: 'FONDEADO',
	contract: 'PN0042',
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('findAffectedBusinesses', () => {
	it('queries FONDEADO businesses with zero active supports', async () => {
		const prisma = buildMockPrisma()
		prisma.business.findMany.mockResolvedValue([affectedBusiness])

		const result = await findAffectedBusinesses(prisma as never)

		expect(prisma.business.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					status: 'FONDEADO',
					supports: { none: { status: true } },
				},
			})
		)
		expect(result).toEqual([affectedBusiness])
	})
})

describe('runRemediation — dry-run', () => {
	it('reports affected businesses without mutating any data', async () => {
		const prisma = buildMockPrisma()
		prisma.business.findMany.mockResolvedValue([affectedBusiness])

		const summary = await runRemediation(prisma as never, { apply: false })

		expect(summary.businessesReverted).toBe(0)
		expect(summary.businessIds).toEqual([42])
		expect(prisma.$transaction).not.toHaveBeenCalled()
	})
})

describe('runRemediation — apply', () => {
	it('reverts business + payments and logs BUSINESS_REMEDIATION_REVERTED per business', async () => {
		const prisma = buildMockPrisma()
		prisma.business.findMany.mockResolvedValue([affectedBusiness])

		const businessUpdate = vi.fn().mockResolvedValue({})
		const paymentUpdateMany = vi.fn().mockResolvedValue({ count: 3 })
		const auditLogCreate = vi.fn().mockResolvedValue({})

		prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
			cb({
				business: { update: businessUpdate },
				payment: { updateMany: paymentUpdateMany },
				auditLog: { create: auditLogCreate },
			})
		)

		const summary = await runRemediation(prisma as never, {
			apply: true,
			operatorEmail: 'operator@test.com',
		})

		expect(businessUpdate).toHaveBeenCalledWith({
			where: { idBusiness: 42 },
			data: { status: 'EMITIDO', dateAnchored: null },
		})
		expect(paymentUpdateMany).toHaveBeenCalledWith({
			where: { idBusiness: 42 },
			data: { status: 'SIN_FONDEAR', dateAnchored: null },
		})
		expect(auditLogCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					action: 'BUSINESS_REMEDIATION_REVERTED',
					email: 'operator@test.com',
				}),
			})
		)
		expect(summary).toEqual({
			businessesReverted: 1,
			paymentsReverted: 3,
			businessIds: [42],
		})
	})

	it('excludes businesses with at least 1 active support from the affected set', async () => {
		const prisma = buildMockPrisma()
		prisma.business.findMany.mockResolvedValue([])

		const summary = await runRemediation(prisma as never, { apply: true })

		expect(summary.businessesReverted).toBe(0)
		expect(prisma.$transaction).not.toHaveBeenCalled()
	})
})
