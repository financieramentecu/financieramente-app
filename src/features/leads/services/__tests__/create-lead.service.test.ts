import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLead } from '../create-lead.service'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { resolveLeadOrigin, assignLeadOrigin } from '../lead-origin.service'

vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: vi.fn() } }))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	AuditAction: { LEAD_CREATED: 'LEAD_CREATED' },
	logAuditEvent: vi.fn(),
}))
vi.mock('../lead-origin.service', () => ({
	resolveLeadOrigin: vi.fn(),
	assignLeadOrigin: vi.fn(),
}))
const tx = {
	user: { findFirst: vi.fn() },
	leadFunnelColumn: { findFirst: vi.fn() },
	lead: { findFirst: vi.fn(), create: vi.fn() },
	leadStageHistory: { create: vi.fn() },
	leadChangeHistory: { createMany: vi.fn() },
}
const ctx = { userId: 1, email: 'creator@example.com' }
beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(prisma.$transaction).mockImplementation(
		async (callback: unknown) =>
			(callback as (client: typeof tx) => Promise<unknown>)(tx) as never
	)
	tx.user.findFirst.mockResolvedValue({
		idUser: 2,
		name: 'Advisor',
		lastName: null,
	})
	tx.leadFunnelColumn.findFirst.mockResolvedValue({ idLeadFunnelColumn: 3 })
	tx.lead.findFirst.mockResolvedValue(null)
	tx.lead.create.mockResolvedValue({ idLead: 4 })
	tx.leadStageHistory.create.mockResolvedValue({})
	vi.mocked(resolveLeadOrigin).mockResolvedValue({
		status: 'ready',
		idClientOrigin: 5,
		name: 'Propio',
		code: 'propio',
		createdCatalog: false,
	})
})
describe('createLead', () => {
	it('creates owner, origin and manual history in one serializable transaction with real actor audit', async () => {
		expect(
			await createLead({ name: 'Ana', email: 'ana@example.com' }, 2, ctx)
		).toEqual({ ok: true, lead: { idLead: 4, idUser: 2 } })
		expect(tx.lead.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					idUser: 2,
					originTag: 'Propio',
					outcomeStatus: 'OPEN',
					idLeadFunnelColumn: 3,
				}),
			})
		)
		expect(tx.lead.create.mock.calls[0][0].data).not.toHaveProperty(
			'externalCrmId'
		)
		expect(assignLeadOrigin).toHaveBeenCalledWith(
			expect.objectContaining({ idLead: 4, idClientOrigin: 5 }),
			tx
		)
		expect(tx.leadStageHistory.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ idUser: 1, source: 'MANUAL' }),
		})
		expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
			isolationLevel: 'Serializable',
		})
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 1,
				email: ctx.email,
				action: 'LEAD_CREATED',
			})
		)
	})
	it.each(['owner', 'column', 'duplicate', 'origin'])(
		'rejects %s without creating a lead or auditing',
		async (failure) => {
			if (failure === 'owner') tx.user.findFirst.mockResolvedValue(null)
			if (failure === 'column')
				tx.leadFunnelColumn.findFirst.mockResolvedValue(null)
			if (failure === 'duplicate')
				tx.lead.findFirst.mockResolvedValue({ idLead: 99 })
			if (failure === 'origin')
				vi.mocked(resolveLeadOrigin).mockResolvedValue({
					status: 'inactive',
					code: 'propio',
				})
			expect(
				await createLead({ name: 'Ana', phone: '123' }, 2, ctx)
			).toMatchObject({ ok: false })
			expect(tx.lead.create).not.toHaveBeenCalled()
			expect(assignLeadOrigin).not.toHaveBeenCalled()
			expect(logAuditEvent).not.toHaveBeenCalled()
		}
	)
	it('propagates transaction failure without a success audit', async () => {
		tx.leadStageHistory.create.mockRejectedValueOnce(
			new Error('storage unavailable')
		)
		await expect(
			createLead({ name: 'Ana', phone: '123' }, 2, ctx)
		).rejects.toThrow('storage unavailable')
		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})
