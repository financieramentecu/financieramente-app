import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { CELL_OWNER_SENTINEL } from '../lib/cell-owner-filter'
import { getHeatmapCellLeads } from '../services/heatmap-cell-leads.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		lead: { count: vi.fn(), findMany: vi.fn() },
	},
}))

import { prisma } from '@/lib/prisma'

const RANGE = { dateFrom: '2026-08-01', dateTo: '2026-08-31' }
const VIEWER = { idUser: 1, role: { code: UserRole.ADMIN } }

describe('getHeatmapCellLeads', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns empty without querying when the hierarchy selection is empty', async () => {
		const result = await getHeatmapCellLeads({
			range: RANGE,
			viewer: VIEWER,
			visibleUserIds: [],
			idLeadFunnelColumn: 3,
			ownerFilter: CELL_OWNER_SENTINEL.ALL,
		})

		expect(result).toEqual({ leads: [], total: 0, isTruncated: false })
		expect(prisma.lead.findMany).not.toHaveBeenCalled()
	})

	it('returns empty when the requested owner is outside the visible scope', async () => {
		const result = await getHeatmapCellLeads({
			range: RANGE,
			viewer: VIEWER,
			visibleUserIds: [10, 11],
			idLeadFunnelColumn: 3,
			ownerFilter: 99,
		})

		expect(result).toEqual({ leads: [], total: 0, isTruncated: false })
		expect(prisma.lead.findMany).not.toHaveBeenCalled()
	})

	it('maps lead rows and flags truncation past the cap', async () => {
		vi.mocked(prisma.lead.count).mockResolvedValue(501)
		vi.mocked(prisma.lead.findMany).mockResolvedValue([
			{
				idLead: 7,
				name: 'Ana',
				lastName: 'Gómez',
				outcomeStatus: 'OPEN',
				createdAt: new Date('2026-08-10T17:00:00.000Z'),
				idBusiness: 44,
				user: { name: 'Luis', lastName: 'Pérez' },
			},
		] as never)

		const result = await getHeatmapCellLeads({
			range: RANGE,
			viewer: VIEWER,
			visibleUserIds: [10],
			idLeadFunnelColumn: 3,
			ownerFilter: 10,
		})

		expect(result.total).toBe(501)
		expect(result.isTruncated).toBe(true)
		expect(result.leads[0]).toMatchObject({
			idLead: 7,
			leadName: 'Ana Gómez',
			ownerName: 'Luis Pérez',
			outcomeStatus: 'OPEN',
			outcomeLabel: 'Abierto',
			idBusiness: 44,
		})
		expect(prisma.lead.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					AND: expect.arrayContaining([{ idUser: 10 }, { idLeadFunnelColumn: 3 }]),
				}),
			})
		)
	})

	it('filters unassigned owners with idUser null', async () => {
		vi.mocked(prisma.lead.count).mockResolvedValue(0)
		vi.mocked(prisma.lead.findMany).mockResolvedValue([])

		await getHeatmapCellLeads({
			range: RANGE,
			viewer: VIEWER,
			visibleUserIds: [10],
			idLeadFunnelColumn: 1,
			ownerFilter: CELL_OWNER_SENTINEL.UNASSIGNED,
		})

		expect(prisma.lead.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					AND: expect.arrayContaining([{ idUser: null }]),
				}),
			})
		)
	})
})
