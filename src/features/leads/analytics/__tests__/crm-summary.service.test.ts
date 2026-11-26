import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { getCrmSummary } from '../crm-summary.service'
import { prisma } from '@/lib/prisma'
import { expandExcludedOwnerIds } from '@/features/leads/services/excluded-owner.service'
vi.mock('@/lib/prisma', () => ({
	prisma: {
		lead: { findMany: vi.fn(), groupBy: vi.fn() },
		leadLink: { findMany: vi.fn() },
		leadTask: { count: vi.fn() },
		leadSupportCase: { count: vi.fn() },
	},
}))
vi.mock('@/features/leads/services/excluded-owner.service', () => ({
	expandExcludedOwnerIds: vi.fn(),
}))
const query = {
	viewer: { idUser: 7, role: { code: UserRole.AGENTE } },
	visibleUserIds: [7, 8],
	isBypass: false,
}
beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(expandExcludedOwnerIds).mockResolvedValue([])
	vi.mocked(prisma.lead.findMany).mockResolvedValue(
		[1, 2, 3].map((idLead) => ({ idLead })) as never
	)
	vi.mocked(prisma.leadLink.findMany).mockResolvedValue([
		{ idLead: 1, idRelatedLead: 2 },
	] as never)
	vi.mocked(prisma.lead.groupBy).mockResolvedValue([
		{ idLeadFunnelColumn: 2, _count: { idLead: 3 } },
	] as never)
	vi.mocked(prisma.leadTask.count)
		.mockResolvedValueOnce(4)
		.mockResolvedValueOnce(2)
	vi.mocked(prisma.leadSupportCase.count)
		.mockResolvedValueOnce(3)
		.mockResolvedValueOnce(1)
})
describe('getCrmSummary', () => {
	it('counts distinct groups plus singletons and counts associated records separately', async () => {
		expect(await getCrmSummary(query)).toEqual({
			opportunities: 2,
			associatedOpportunities: 2,
			stageCounts: [{ idLeadFunnelColumn: 2, count: 3 }],
			openTasks: 4,
			overdueTasks: 2,
			openCases: 3,
			overdueCases: 1,
		})
		expect(prisma.lead.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ select: { idLead: true } })
		)
		expect(prisma.leadTask.count).toHaveBeenCalledTimes(2)
		expect(prisma.leadSupportCase.count).toHaveBeenCalledTimes(2)
	})
	it('returns zero aggregates without querying an empty non-bypass scope', async () => {
		expect(await getCrmSummary({ ...query, visibleUserIds: [] })).toEqual({
			opportunities: 0,
			associatedOpportunities: 0,
			stageCounts: [],
			openTasks: 0,
			overdueTasks: 0,
			openCases: 0,
			overdueCases: 0,
		})
		expect(prisma.lead.findMany).not.toHaveBeenCalled()
	})
	it('keeps visible intermediaries outside date/origin/outcome but excludes unselected branches from the graph', async () => {
		const range = {
			gte: new Date('2026-11-01T05:00:00Z'),
			lte: new Date('2026-12-01T04:59:59Z'),
		}
		vi.mocked(expandExcludedOwnerIds).mockResolvedValue([8, 9])
		vi.mocked(prisma.lead.findMany)
			.mockResolvedValueOnce([{ idLead: 1 }, { idLead: 3 }] as never)
			.mockResolvedValueOnce([
				{ idLead: 1 },
				{ idLead: 2 },
				{ idLead: 3 },
			] as never)
		vi.mocked(prisma.leadLink.findMany).mockResolvedValue([
			{ idLead: 1, idRelatedLead: 2 },
			{ idLead: 2, idRelatedLead: 3 },
			{ idLead: 3, idRelatedLead: 99 },
		] as never)
		const summary = await getCrmSummary({
			...query,
			filters: {
				ownerIds: [7],
				excludedOwnerIds: [8],
				outcomeStatuses: ['OPEN'],
				originIds: [5],
				createdAtRange: range,
			},
		})
		expect(summary).toMatchObject({
			opportunities: 1,
			associatedOpportunities: 2,
		})
		expect(expandExcludedOwnerIds).toHaveBeenCalledWith([8], [7, 8])
		const calls = vi.mocked(prisma.lead.findMany).mock.calls
		expect(calls[0][0]?.where).toEqual(
			expect.objectContaining({
				AND: [
					expect.objectContaining({
						AND: expect.arrayContaining([
							{ outcomeStatus: { in: ['OPEN'] } },
							{ createdAt: range },
							{ idUser: { notIn: [8, 9] } },
						]),
					}),
					{ funnelColumn: { active: true } },
				],
			})
		)
		expect(calls[1][0]?.where).toEqual({
			AND: [
				{ active: true },
				{ idUser: { in: [7, 8] } },
				{ idUser: { in: [7] } },
				{ idUser: { notIn: [8, 9] } },
			],
		})
		expect(prisma.leadLink.findMany).toHaveBeenCalledWith({
			where: {
				active: true,
				lead: calls[1][0]?.where,
				relatedLead: calls[1][0]?.where,
			},
			select: { idLead: true, idRelatedLead: true },
		})
	})
})
