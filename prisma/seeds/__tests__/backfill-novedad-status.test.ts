import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpdateMany, mockAuditCreate, mockCount } = vi.hoisted(() => ({
	mockUpdateMany: vi.fn(),
	mockAuditCreate: vi.fn(),
	mockCount: vi.fn(),
}))

vi.mock('@prisma/client', () => {
	return {
		PrismaClient: vi.fn().mockImplementation(() => ({
			business: {
				updateMany: mockUpdateMany,
				count: mockCount,
			},
			auditLog: {
				create: mockAuditCreate,
			},
			$disconnect: vi.fn(),
		})),
	}
})

import { backfillNovedadStatus } from '../backfill-novedad-status'

describe('backfillNovedadStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('updates rows where novedadStatus IN (PENDIENTE, RESUELTA) to NUEVA', async () => {
		mockUpdateMany.mockResolvedValue({ count: 3 })

		await backfillNovedadStatus({ dryRun: false })

		expect(mockUpdateMany).toHaveBeenCalledWith({
			where: { novedadStatus: { in: ['PENDIENTE', 'RESUELTA'] } },
			data: { novedadStatus: 'NUEVA' },
		})
	})

	it('logs one SYSTEM_ACTOR audit entry per batch when rows are updated', async () => {
		mockUpdateMany.mockResolvedValue({ count: 3 })

		await backfillNovedadStatus({ dryRun: false })

		expect(mockAuditCreate).toHaveBeenCalledTimes(1)
		expect(mockAuditCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					email: 'system@migration',
				}),
			})
		)
	})

	it('--dry-run performs zero writes', async () => {
		mockCount.mockResolvedValue(3)

		await backfillNovedadStatus({ dryRun: true })

		expect(mockUpdateMany).not.toHaveBeenCalled()
		expect(mockAuditCreate).not.toHaveBeenCalled()
	})

	it('is idempotent — a second run with zero matching rows performs no audit write', async () => {
		mockUpdateMany.mockResolvedValue({ count: 0 })

		await backfillNovedadStatus({ dryRun: false })

		expect(mockUpdateMany).toHaveBeenCalledTimes(1)
		expect(mockAuditCreate).not.toHaveBeenCalled()
	})
})
