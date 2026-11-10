import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/features/auth/lib/roles'
import { DEFAULT_LEAD_TABLE_QUERY } from '@/features/leads/table/lead-table-query.schema'
import {
	LEAD_TABLE_EXPORT_LIMIT,
	getLeadTable,
	listLeadTableForExport,
} from '@/features/leads/table/lead-table.service'

vi.mock('@/lib/prisma', () => ({
	prisma: { lead: { findMany: vi.fn(), count: vi.fn() } },
}))

const viewer = { idUser: 5, role: { code: UserRole.AGENTE } }
const options = { visibleUserIds: [5], now: new Date('2026-11-10T15:00:00.000Z'), inactivityDays: 7 }

function row(overrides: Record<string, unknown> = {}) {
	return {
		idLead: 1,
		name: 'Ana',
		lastName: 'Pérez',
		email: 'ana@x.co',
		phone: '300',
		originTag: 'web',
		idUser: 5,
		idLeadFunnelColumn: 2,
		outcomeStatus: 'OPEN',
		estimatedValue: new Prisma.Decimal('1000000'),
		probability: 50,
		createdAt: new Date('2026-10-01T15:00:00.000Z'),
		lastActivityAt: null,
		user: { name: 'Luis', lastName: 'Gómez' },
		funnelColumn: { name: 'Contactado' },
		tagAssignments: [{ tag: { idLeadTag: 2, name: 'VIP', color: '#f00' } }],
		...overrides,
	}
}

describe('getLeadTable', () => {
	beforeEach(() => vi.clearAllMocks())

	it('pages, sorts with a stable tie-break and maps rows', async () => {
		vi.mocked(prisma.lead.findMany)
			.mockResolvedValueOnce([row()] as never)
			.mockResolvedValueOnce([] as never)
		vi.mocked(prisma.lead.count).mockResolvedValue(31)

		const result = await getLeadTable(viewer, { ...DEFAULT_LEAD_TABLE_QUERY, sort: 'estimatedValue', dir: 'asc', page: 2, pageSize: 10 }, options)

		const pageCall = vi.mocked(prisma.lead.findMany).mock.calls[0][0]
		expect(pageCall).toMatchObject({
			skip: 10,
			take: 10,
			orderBy: [{ estimatedValue: { sort: 'asc', nulls: 'last' } }, { idLead: 'asc' }],
		})
		expect(result).toMatchObject({ total: 31, page: 2, pageSize: 10 })
		expect(result.items[0]).toEqual({
			idLead: 1,
			name: 'Ana',
			lastName: 'Pérez',
			email: 'ana@x.co',
			phone: '300',
			originTag: 'web',
			idUser: 5,
			ownerName: 'Luis Gómez',
			idLeadFunnelColumn: 2,
			stageName: 'Contactado',
			outcomeStatus: 'OPEN',
			estimatedValue: '1000000',
			probability: 50,
			weightedValue: '500000',
			tags: [{ idLeadTag: 2, name: 'VIP', color: '#f00' }],
			createdAt: '2026-10-01T15:00:00.000Z',
			lastActivityAt: null,
			inactiveDays: 40,
		})
	})

	it('sorts by name then last name', async () => {
		vi.mocked(prisma.lead.findMany).mockResolvedValue([] as never)
		vi.mocked(prisma.lead.count).mockResolvedValue(0)
		await getLeadTable(viewer, { ...DEFAULT_LEAD_TABLE_QUERY, sort: 'name', dir: 'desc' }, options)
		expect(vi.mocked(prisma.lead.findMany).mock.calls[0][0]?.orderBy).toEqual([
			{ name: { sort: 'desc', nulls: 'last' } },
			{ lastName: { sort: 'desc', nulls: 'last' } },
			{ idLead: 'desc' },
		])
	})

	it('sums estimated and weighted value over the whole filtered set', async () => {
		vi.mocked(prisma.lead.findMany)
			.mockResolvedValueOnce([] as never)
			.mockResolvedValueOnce([
				{ estimatedValue: new Prisma.Decimal('1000000'), probability: 50 },
				{ estimatedValue: new Prisma.Decimal('2000000'), probability: null },
				{ estimatedValue: new Prisma.Decimal('10.55'), probability: 33 },
			] as never)
		vi.mocked(prisma.lead.count).mockResolvedValue(3)
		const result = await getLeadTable(viewer, DEFAULT_LEAD_TABLE_QUERY, options)
		const totalsCall = vi.mocked(prisma.lead.findMany).mock.calls[1][0]
		expect(JSON.stringify(totalsCall?.where)).toContain('"estimatedValue":{"not":null}')
		expect(result.totals).toEqual({ estimatedValue: '3000010.55', weightedValue: '500003.48' })
	})

	it('omits totals above the cap', async () => {
		vi.mocked(prisma.lead.findMany)
			.mockResolvedValueOnce([] as never)
			.mockResolvedValueOnce(
				Array.from({ length: LEAD_TABLE_EXPORT_LIMIT + 1 }, () => ({ estimatedValue: new Prisma.Decimal(1), probability: 1 })) as never
			)
		vi.mocked(prisma.lead.count).mockResolvedValue(LEAD_TABLE_EXPORT_LIMIT + 1)
		const result = await getLeadTable(viewer, DEFAULT_LEAD_TABLE_QUERY, options)
		expect(result.totals).toEqual({ estimatedValue: null, weightedValue: null })
	})
})

describe('listLeadTableForExport', () => {
	beforeEach(() => vi.clearAllMocks())

	it('refuses more rows than the export limit', async () => {
		vi.mocked(prisma.lead.count).mockResolvedValue(LEAD_TABLE_EXPORT_LIMIT + 1)
		await expect(listLeadTableForExport(viewer, DEFAULT_LEAD_TABLE_QUERY, options)).resolves.toEqual({
			ok: false,
			reason: 'TOO_MANY_ROWS',
		})
		expect(prisma.lead.findMany).not.toHaveBeenCalled()
	})

	it('returns every filtered row without paging', async () => {
		vi.mocked(prisma.lead.count).mockResolvedValue(1)
		vi.mocked(prisma.lead.findMany).mockResolvedValue([row()] as never)
		const result = await listLeadTableForExport(viewer, { ...DEFAULT_LEAD_TABLE_QUERY, page: 3 }, options)
		expect(result.ok && result.rows).toHaveLength(1)
		const call = vi.mocked(prisma.lead.findMany).mock.calls[0][0]
		expect(call?.skip).toBeUndefined()
		expect(call?.take).toBe(LEAD_TABLE_EXPORT_LIMIT)
	})
})
