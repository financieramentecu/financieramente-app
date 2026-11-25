import { beforeEach, expect, it, vi } from 'vitest'
import { getLeadBoard } from '../lead-board.service'
import { getLeadAssociationGraph } from '../lead-associations.service'
import { expandExcludedOwnerIds } from '../excluded-owner.service'
import { prisma } from '@/lib/prisma'
vi.mock('@/lib/prisma', () => ({
	prisma: {
		lead: { findMany: vi.fn() },
		leadFunnelColumn: { findMany: vi.fn() },
	},
}))
vi.mock('../lead-associations.service', () => ({
	getLeadAssociationGraph: vi.fn(),
}))
vi.mock('../excluded-owner.service', () => ({
	expandExcludedOwnerIds: vi.fn(),
}))
const viewer = { idUser: 5, role: { code: 'AGENTE' } }
beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(prisma.lead.findMany).mockResolvedValue([])
	vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([])
	vi.mocked(expandExcludedOwnerIds).mockResolvedValue([8, 9])
	vi.mocked(getLeadAssociationGraph).mockResolvedValue({
		leadIds: [1, 2, 3, 4],
		links: [
			{ idLead: 1, idRelatedLead: 2 },
			{ idLead: 2, idRelatedLead: 3 },
			{ idLead: 3, idRelatedLead: 99 },
			{ idLead: 4, idRelatedLead: 4 },
		],
	})
})
it('filters to scoped associated members while keeping contextual filters and out-of-filter graph intermediaries', async () => {
	const range = {
		gte: new Date('2026-11-01T05:00:00Z'),
		lte: new Date('2026-12-01T04:59:59Z'),
	}
	await getLeadBoard(viewer, {
		visibleUserIds: [5, 6, 8, 9],
		excludedOwnerIds: [8],
		ownerIds: [5, 6],
		outcomeStatuses: ['OPEN'],
		originIds: [4],
		createdAtRange: range,
		associatedOnly: true,
	})
	const graphWhere = {
		AND: [
			{ active: true },
			{ idUser: { in: [5, 6, 8, 9] } },
			{ idUser: { in: [5, 6] } },
			{ idUser: { notIn: [8, 9] } },
		],
	}
	expect(getLeadAssociationGraph).toHaveBeenCalledWith(graphWhere)
	expect(prisma.lead.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				AND: [
					expect.objectContaining({
						AND: expect.arrayContaining([
							{ outcomeStatus: { in: ['OPEN'] } },
							{ createdAt: range },
						]),
					}),
					{ idLead: { in: [1, 2, 3] } },
				],
			},
		})
	)
})
it('retains person grouping without narrowing ids when associated-only is cleared', async () => {
	await getLeadBoard(viewer, { visibleUserIds: [5], associatedOnly: false })
	expect(getLeadAssociationGraph).toHaveBeenCalledTimes(1)
	expect(prisma.lead.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				AND: [
					{ active: true },
					{ idUser: { in: [5] } },
					{ idUser: { notIn: [8, 9] } },
				],
			},
		})
	)
})
it('returns no related records when the selected graph has no actual associations', async () => {
	vi.mocked(getLeadAssociationGraph).mockResolvedValue({
		leadIds: [1],
		links: [{ idLead: 1, idRelatedLead: 99 }],
	})
	await getLeadBoard(viewer, { visibleUserIds: [5], associatedOnly: true })
	expect(prisma.lead.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { AND: [expect.any(Object), { idLead: { in: [] } }] },
		})
	)
})

it('shows one person card with both active captures, ordered by level without changing their lifecycle', async () => {
 vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([{ idLeadFunnelColumn: 1, name: 'Nuevo', position: 0, isFallback: false }, { idLeadFunnelColumn: 2, name: 'Contacto', position: 1, isFallback: false }] as never)
 const common = { name: 'Ana', lastName: null, email: 'ana@example.com', phone: null, originTag: 'Propio', idUser: 5, user: null, outcomeStatus: 'OPEN', idBusiness: null, lastActivityAt: null, estimatedValue: null, tagAssignments: [] }
 vi.mocked(prisma.lead.findMany).mockResolvedValue([
  { ...common, idLead: 1, idLeadFunnelColumn: 1, capture: { idLeadCapture: 1, name: 'Inicial', level: 1, status: true }, createdAt: new Date('2026-11-20') },
  { ...common, idLead: 2, idLeadFunnelColumn: 2, capture: { idLeadCapture: 2, name: 'Avanzada', level: 2, status: true }, createdAt: new Date('2026-11-21') },
 ] as never)
 const board = await getLeadBoard(viewer, { visibleUserIds: [5] })
 expect(board[0].leads).toHaveLength(0)
 expect(board[1].leads).toHaveLength(1)
 expect(board[1].leads[0]).toMatchObject({ idLead: 2, personKey: 1, captures: [expect.objectContaining({ idLead: 2, outcomeStatus: 'OPEN' }), expect.objectContaining({ idLead: 1, outcomeStatus: 'OPEN' })] })
})
