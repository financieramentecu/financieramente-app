import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { getLeadsAnalyticsReport } from '../services/leads-analytics.service'
import { EMPTY_LEADS_ANALYTICS_REPORT } from '../lib/empty-report'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadFunnelColumn: { findMany: vi.fn() },
		lead: { groupBy: vi.fn() },
		user: { findMany: vi.fn() },
	},
}))

import { prisma } from '@/lib/prisma'

describe('getLeadsAnalyticsReport', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns an empty report without querying when non-bypass scope is empty', async () => {
		const result = await getLeadsAnalyticsReport({
			range: { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
			viewer: { idUser: 9, role: { code: UserRole.AGENTE } },
			visibleUserIds: [],
			isBypass: false,
		})

		expect(result).toEqual(EMPTY_LEADS_ANALYTICS_REPORT)
		expect(prisma.lead.groupBy).not.toHaveBeenCalled()
	})

	it('aggregates bars, converted slices and heatmap from groupBy rows', async () => {
		vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([
			{ idLeadFunnelColumn: 1, name: 'Lead nuevo', position: 0 },
			{ idLeadFunnelColumn: 2, name: 'Contactado', position: 1 },
		] as never)
		vi.mocked(prisma.lead.groupBy)
			.mockResolvedValueOnce([
				{ idLeadFunnelColumn: 1, _count: { idLead: 4 } },
				{ idLeadFunnelColumn: 2, _count: { idLead: 0 } },
			] as never)
			.mockResolvedValueOnce([
				{ outcomeStatus: 'OPEN', _count: { idLead: 2 } },
				{ outcomeStatus: 'WON', _count: { idLead: 1 } },
			] as never)
			.mockResolvedValueOnce([
				{
					idUser: 10,
					idLeadFunnelColumn: 1,
					_count: { idLead: 4 },
				},
			] as never)
		vi.mocked(prisma.user.findMany).mockResolvedValue([
			{ idUser: 10, name: 'Ana', lastName: 'Pérez' },
		] as never)

		const result = await getLeadsAnalyticsReport({
			range: { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
			viewer: { idUser: 1, role: { code: UserRole.ADMIN } },
			visibleUserIds: [],
			isBypass: true,
		})

		expect(result.followUpBars).toEqual([
			{
				idLeadFunnelColumn: 1,
				name: 'Lead nuevo',
				position: 0,
				count: 4,
			},
		])
		expect(result.converted.total).toBe(3)
		expect(result.heatmap.rows[0]?.ownerName).toBe('Ana Pérez')
		expect(result.heatmap.rows[0]?.cells).toEqual([4])
	})
})
