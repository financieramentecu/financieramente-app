import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { assignLeadOwner } from '../assign-lead-owner.service'
import {
	collectPersonGroupIds,
	resolvePersonGroupOwner,
	propagatePersonGroupOwner,
	LeadPersonGroupError,
} from '../lead-person-group.service'
vi.mock('@/lib/prisma', () => ({
	prisma: {
		$transaction: vi.fn(),
		lead: { findFirst: vi.fn() },
		user: { findFirst: vi.fn() },
	},
}))
vi.mock('../lead-person-group.service', async (importOriginal) => ({
	...(await importOriginal<typeof import('../lead-person-group.service')>()),
	collectPersonGroupIds: vi.fn(),
	resolvePersonGroupOwner: vi.fn(),
	propagatePersonGroupOwner: vi.fn(),
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	AuditAction: { LEAD_OWNER_ASSIGNED: 'LEAD_OWNER_ASSIGNED' },
	logAuditEvent: vi.fn(),
}))
const ctx = { userId: 7, email: 'actor@example.com' }
beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(prisma.$transaction).mockImplementation(
		async (callback) =>
			(callback as unknown as (tx: typeof prisma) => Promise<unknown>)(
				prisma
			) as never
	)
	vi.mocked(prisma.lead.findFirst).mockResolvedValue({ idLead: 1 } as never)
	vi.mocked(prisma.user.findFirst).mockResolvedValue({
		name: 'Laura',
		lastName: 'Gomez',
	} as never)
	vi.mocked(collectPersonGroupIds).mockResolvedValue([1, 2, 3])
	vi.mocked(resolvePersonGroupOwner).mockResolvedValue(9)
})
describe('assignLeadOwner', () => {
	it('validates the entire group and target before atomic propagation', async () => {
		expect(await assignLeadOwner(1, 9, ctx, [7, 9])).toEqual({
			ok: true,
			idUser: 9,
			ownerName: 'Laura Gomez',
			assignedLeadIds: [1, 2, 3],
		})
		expect(resolvePersonGroupOwner).toHaveBeenCalledWith(prisma, [1, 2, 3], {
			manageableUserIds: [7, 9],
			targetOwnerId: 9,
		})
		expect(propagatePersonGroupOwner).toHaveBeenCalledWith(
			prisma,
			[1, 2, 3],
			9,
			{ source: 'MANUAL', idActor: 7, actorLabel: ctx.email }
		)
		expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
			isolationLevel: 'Serializable',
		})
	})
	it('rejects generically without propagation when any member is outside write scope', async () => {
		vi.mocked(resolvePersonGroupOwner).mockRejectedValue(
			new LeadPersonGroupError()
		)
		expect(await assignLeadOwner(1, 9, ctx, [7, 9])).toEqual({
			ok: false,
			status: 409,
			error: 'No fue posible modificar el grupo relacionado',
		})
		expect(propagatePersonGroupOwner).not.toHaveBeenCalled()
	})
})
