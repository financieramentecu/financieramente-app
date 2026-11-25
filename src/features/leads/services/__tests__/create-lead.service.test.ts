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
	lead: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
	leadLink: { createMany: vi.fn(), findMany: vi.fn() },
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
	tx.lead.findMany.mockResolvedValue([])
	tx.leadLink.findMany.mockResolvedValue([])
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
	it.each(['owner', 'column', 'origin'])(
		'rejects %s without creating a lead or auditing',
		async (failure) => {
			if (failure === 'owner') tx.user.findFirst.mockResolvedValue(null)
			if (failure === 'column')
				tx.leadFunnelColumn.findFirst.mockResolvedValue(null)
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
	it('creates a distinct lead linked to every contact match without changing existing owners', async () => {
		tx.lead.findMany
			.mockResolvedValueOnce([{ idLead: 11 }, { idLead: 12 }, { idLead: 13 }])
			.mockResolvedValueOnce([
				{ idLead: 11, idUser: 2 },
				{ idLead: 12, idUser: 2 },
				{ idLead: 13, idUser: 2 },
			])
			.mockResolvedValue([])
		expect(
			await createLead(
				{
					name: 'Ana',
					email: 'ana@example.com',
					phone: '123',
					identityNumber: 'AB12',
				},
				2,
				ctx,
				[]
			)
		).toEqual({ ok: true, lead: { idLead: 4, idUser: 2 } })
		expect(tx.lead.findMany).toHaveBeenCalledWith({
			where: {
				active: true,
				OR: [
					{ email: { equals: 'ana@example.com', mode: 'insensitive' } },
					{ phone: '123' },
					{ identityNumber: 'AB12' },
				],
			},
			select: { idLead: true },
		})
		expect(tx.leadLink.createMany).toHaveBeenCalledWith({
			data: [11, 12, 13].map((idRelatedLead) => ({
				idLead: 4,
				idRelatedLead,
				idClientOrigin: 5,
				source: 'AUTO',
				linkedAt: expect.any(Date),
				linkedBy: 1,
			})),
		})
		expect(tx.lead.create).toHaveBeenCalledTimes(1)
		expect(tx.lead.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ idUser: 2 }) })
		)
	})
	it('creates without relation writes when no existing lead matches', async () => {
		expect(
			await createLead({ name: 'Ana', phone: '123' }, 2, ctx)
		).toMatchObject({ ok: true })
		expect(tx.lead.findMany).toHaveBeenCalledWith({
			where: { active: true, OR: [{ phone: '123' }] },
			select: { idLead: true },
		})
		expect(tx.leadLink.createMany).not.toHaveBeenCalled()
	})
	it('escapes email wildcards without introducing empty contact matches', async () => {
		await createLead(
			{
				name: 'Ana',
				email: 'ana_%@example.com',
				phone: '',
				identityNumber: '',
			},
			2,
			ctx
		)
		expect(tx.lead.findMany).toHaveBeenCalledWith({
			where: {
				active: true,
				OR: [
					{ email: { equals: 'ana\\_\\%@example.com', mode: 'insensitive' } },
				],
			},
			select: { idLead: true },
		})
	})
	it('fails the transaction if automatic linkage fails, without auditing success', async () => {
		tx.lead.findMany
			.mockResolvedValueOnce([{ idLead: 11 }])
			.mockResolvedValueOnce([{ idLead: 11, idUser: 2 }])
			.mockResolvedValue([])
		tx.leadLink.createMany.mockRejectedValueOnce(
			new Error('link storage unavailable')
		)
		await expect(
			createLead({ name: 'Ana', phone: '123' }, 2, ctx, [])
		).rejects.toThrow('link storage unavailable')
		expect(tx.leadStageHistory.create).not.toHaveBeenCalled()
		expect(logAuditEvent).not.toHaveBeenCalled()
	})
})
