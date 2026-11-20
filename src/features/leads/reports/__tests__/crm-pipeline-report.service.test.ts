import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/features/auth/lib/roles'
import {
	CRM_REPORT_LEAD_LIMIT,
	getCrmPipelineReport,
} from '@/features/leads/reports/crm-pipeline-report.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		lead: { count: vi.fn(), findMany: vi.fn() },
		leadStageHistory: { findMany: vi.fn() },
		leadFunnelColumn: { findMany: vi.fn() },
		user: { findMany: vi.fn() },
	},
}))

const viewer = { idUser: 5, role: { code: UserRole.AGENTE } }
const query = { from: '2026-10-01', to: '2026-10-31', ownerIds: [5, 99] }
const NOW = new Date('2026-11-09T15:00:00Z')

function mockDataset() {
	vi.mocked(prisma.lead.count).mockResolvedValue(2)
	vi.mocked(prisma.lead.findMany).mockResolvedValue([
		{
			idLead: 1,
			idUser: 5,
			idLeadFunnelColumn: 1,
			outcomeStatus: 'OPEN',
			originTag: 'Web',
			estimatedValue: new Prisma.Decimal('1500.5'),
			probability: 40,
			createdAt: new Date('2026-10-02T15:00:00Z'),
		},
		{
			idLead: 2,
			idUser: null,
			idLeadFunnelColumn: 2,
			outcomeStatus: 'WON',
			originTag: null,
			estimatedValue: null,
			probability: null,
			createdAt: new Date('2026-10-03T15:00:00Z'),
		},
	] as never)
	vi.mocked(prisma.leadStageHistory.findMany).mockResolvedValue([
		{ idLead: 2, fromIdLeadFunnelColumn: 1, toIdLeadFunnelColumn: 2, changedAt: new Date('2026-10-05T15:00:00Z') },
	] as never)
	vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([
		{ idLeadFunnelColumn: 1, name: 'Nuevo', position: 0, active: true, isFallback: false },
		{ idLeadFunnelColumn: 2, name: 'Contactado', position: 1, active: true, isFallback: false },
	] as never)
	vi.mocked(prisma.user.findMany).mockResolvedValue([
		{ idUser: 5, name: 'Ana', lastName: 'Ruiz', leader: { idUser: 10, name: 'Laura', lastName: null } },
	] as never)
}

describe('getCrmPipelineReport', () => {
	beforeEach(() => vi.clearAllMocks())

	it('scopes leads by hierarchy, created range and owners (narrowed to the hierarchy)', async () => {
		mockDataset()
		await getCrmPipelineReport(viewer, query, [5, 6], NOW)

		const where = vi.mocked(prisma.lead.count).mock.calls[0]![0]!.where
		const serialized = JSON.stringify(where)
		expect(serialized).toContain('"idUser":{"in":[5]}')
		expect(serialized).toContain('"createdAt"')
		expect(vi.mocked(prisma.lead.findMany).mock.calls[0]![0]).toMatchObject({ where })
		expect(vi.mocked(prisma.leadStageHistory.findMany).mock.calls[0]![0]).toMatchObject({
			where: { lead: where },
			orderBy: [{ idLead: 'asc' }, { changedAt: 'asc' }],
		})
	})

	it('never selects contact fields', async () => {
		mockDataset()
		await getCrmPipelineReport(viewer, query, [5], NOW)
		const select = vi.mocked(prisma.lead.findMany).mock.calls[0]![0]!.select as Record<string, unknown>
		for (const field of ['name', 'lastName', 'email', 'phone', 'identityNumber']) {
			expect(select).not.toHaveProperty(field)
		}
	})

	it('refuses cohorts above the limit without loading them', async () => {
		vi.mocked(prisma.lead.count).mockResolvedValue(CRM_REPORT_LEAD_LIMIT + 1)
		await expect(getCrmPipelineReport(viewer, query, [5], NOW)).resolves.toEqual({
			ok: false,
			reason: 'TOO_MANY_LEADS',
			total: CRM_REPORT_LEAD_LIMIT + 1,
		})
		expect(prisma.lead.findMany).not.toHaveBeenCalled()
	})

	it('maps the dataset into the report, joining owner and leader names', async () => {
		mockDataset()
		const result = await getCrmPipelineReport(viewer, query, [5], NOW)
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { idUser: { in: [5] } } }))
		expect(result.report.range).toEqual({ from: '2026-10-01', to: '2026-10-31' })
		expect(result.report.outcomes).toMatchObject({ total: 2, won: 1, open: 1 })
		expect(result.report.funnel.map((stage) => stage.reached)).toEqual([2, 1])
		expect(result.report.byAdvisor[0]).toMatchObject({ key: '5', label: 'Ana Ruiz', estimatedValue: '1500.5', weightedValue: '600.2' })
		expect(result.report.byTeam.map((row) => row.label)).toEqual(['Laura', 'Sin asignar'])
	})

	it('skips the owner query when no lead has an owner', async () => {
		mockDataset()
		vi.mocked(prisma.lead.findMany).mockResolvedValue([] as never)
		vi.mocked(prisma.lead.count).mockResolvedValue(0)
		await getCrmPipelineReport(viewer, query, [5], NOW)
		expect(prisma.user.findMany).not.toHaveBeenCalled()
	})
})
