import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getLeadActivityPage } from '@/features/leads/activities/lead-activity.service'
import { getLeadTimelinePage } from '@/features/leads/activities/lead-timeline.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadStageHistory: { findMany: vi.fn() },
		leadLink: { findMany: vi.fn() },
		leadChangeHistory: { findMany: vi.fn() },
	},
}))
vi.mock('@/features/leads/activities/lead-activity.service', () => ({ getLeadActivityPage: vi.fn() }))

const activity = (id: number, iso: string) => ({
	idLeadActivity: id,
	type: 'CALL_LOGGED' as const,
	occurredAt: new Date(iso),
	actorName: 'Ana',
	payload: { summary: 'ok' },
})
const stage = (id: number, iso: string) => ({
	idLeadStageHistory: id,
	changedAt: new Date(iso),
	source: 'CRM_SYNC' as const,
	fromColumn: { name: 'Nuevo' },
	toColumn: { name: 'Contactado' },
	user: null,
	lead: { user: { name: 'Ana', lastName: 'Torres' } },
})

describe('getLeadTimelinePage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.leadLink.findMany).mockResolvedValue([])
		vi.mocked(prisma.leadChangeHistory.findMany).mockResolvedValue([])
	})

	it('merges activities and stage changes newest first', async () => {
		vi.mocked(getLeadActivityPage).mockResolvedValue({ items: [activity(1, '2026-11-09T11:00:00Z')], nextCursor: null })
		vi.mocked(prisma.leadStageHistory.findMany).mockResolvedValue([stage(3, '2026-11-09T10:00:00Z')] as never)

		const page = await getLeadTimelinePage(12, { limit: 10 })

		expect(page.items).toEqual([
			expect.objectContaining({ kind: 'activity', idLeadActivity: 1 }),
			{
				kind: 'stage_change',
				idLeadStageHistory: 3,
				occurredAt: new Date('2026-11-09T10:00:00Z'),
				actorName: 'Ana Torres',
				fromColumnName: 'Nuevo',
				toColumnName: 'Contactado',
				source: 'CRM_SYNC',
			},
		])
		expect(page.nextCursor).toBeNull()
	})

	it('returns a cursor at the last item when more exist', async () => {
		vi.mocked(getLeadActivityPage).mockResolvedValue({
			items: [activity(2, '2026-11-09T12:00:00Z')],
			nextCursor: { occurredAt: new Date('2026-11-09T12:00:00Z'), idLeadActivity: 2 },
		})
		vi.mocked(prisma.leadStageHistory.findMany).mockResolvedValue([])
		const page = await getLeadTimelinePage(12, { limit: 1 })
		expect(page.nextCursor).toBe('2026-11-09T12:00:00.000Z|activity|2')
	})

	it('before a stage-change cursor skips activities at that same instant', async () => {
		vi.mocked(getLeadActivityPage).mockResolvedValue({ items: [], nextCursor: null })
		vi.mocked(prisma.leadStageHistory.findMany).mockResolvedValue([])
		const occurredAt = new Date('2026-11-09T10:00:00Z')
		await getLeadTimelinePage(12, { limit: 5, cursor: { occurredAt, kind: 'stage_change', id: 3 } })

		expect(getLeadActivityPage).toHaveBeenCalledWith(prisma, 12, {
			limit: 5,
			cursor: { occurredAt, idLeadActivity: 0 },
		})
		expect(vi.mocked(prisma.leadStageHistory.findMany).mock.calls[0][0]?.where).toEqual({
			idLead: 12,
			OR: [{ changedAt: { lt: occurredAt } }, { changedAt: occurredAt, idLeadStageHistory: { lt: 3 } }],
		})
	})

	it('before an activity cursor keeps only older stage changes', async () => {
		vi.mocked(getLeadActivityPage).mockResolvedValue({ items: [], nextCursor: null })
		vi.mocked(prisma.leadStageHistory.findMany).mockResolvedValue([])
		const occurredAt = new Date('2026-11-09T10:00:00Z')
		await getLeadTimelinePage(12, { limit: 5, cursor: { occurredAt, kind: 'activity', id: 8 } })

		expect(getLeadActivityPage).toHaveBeenCalledWith(prisma, 12, {
			limit: 5,
			cursor: { occurredAt, idLeadActivity: 8 },
		})
		expect(vi.mocked(prisma.leadStageHistory.findMany).mock.calls[0][0]?.where).toEqual({
			idLead: 12,
			changedAt: { lt: occurredAt },
		})
	})
	it.each([
		{ idLead: 4, side: 'incoming', linkIds: [21, 22] },
		{ idLead: 11, side: 'related', linkIds: [21] },
		{ idLead: 12, side: 'related', linkIds: [22] },
	])(
		'shows automatic contact relations on lead $idLead without sharing activities',
		async ({ idLead, side, linkIds }) => {
			vi.mocked(getLeadActivityPage).mockResolvedValue({
				items: [],
				nextCursor: null,
			})
			vi.mocked(prisma.leadStageHistory.findMany).mockResolvedValue([])
			const linkedAt = new Date('2026-11-23T10:00:00Z')
			const links = [11, 12].map((idRelatedLead, index) => ({
				idLeadLink: 21 + index,
				idLead: 4,
				idRelatedLead,
				source: 'AUTO',
				linkedAt,
				clientOrigin: { name: 'Propio' },
				linker: { name: 'Creator', lastName: 'Test' },
				lead: {
					name: 'Ana',
					lastName: 'New',
					user: { name: 'Selected', lastName: 'Advisor' },
				},
				relatedLead: {
					name: 'Ana',
					lastName: 'Existing',
					user: { name: 'Previous', lastName: 'Advisor' },
				},
			}))
			vi.mocked(prisma.leadLink.findMany).mockResolvedValue(
				links.filter((link) => link.idLead === idLead || link.idRelatedLead === idLead) as never
			)

			const page = await getLeadTimelinePage(idLead, { limit: 10 })
			expect(prisma.leadLink.findMany).toHaveBeenCalledWith(expect.objectContaining({
				where: { active: true, OR: [{ idLead }, { idRelatedLead: idLead }] },
			}))

			expect(page.items).toHaveLength(linkIds.length)
			expect(page.items).toEqual(
				expect.arrayContaining(
					linkIds.map((idLeadLink) =>
						expect.objectContaining({
							kind: 'lead_ingress',
							idLeadLink,
							side,
							source: 'AUTO',
							actorName: 'Creator Test',
							originName: 'Propio',
						})
					)
				)
			)
			expect(getLeadActivityPage).toHaveBeenCalledWith(prisma, idLead, {
				limit: 10,
				cursor: undefined,
			})
		}
	)
})
