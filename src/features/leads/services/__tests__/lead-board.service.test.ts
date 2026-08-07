import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/features/auth/lib/roles'
import {
	getLeadBoard,
	getLeadDetail,
} from '@/features/leads/services/lead-board.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadFunnelColumn: {
			findMany: vi.fn(),
		},
		lead: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
		},
	},
}))

describe('getLeadBoard', () => {
	beforeEach(() => vi.clearAllMocks())

	it('groups leads by column server-side', async () => {
		vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([
			{ idLeadFunnelColumn: 1, name: 'Sin mapear', position: 0, isFallback: true },
			{ idLeadFunnelColumn: 2, name: 'Nuevo', position: 1, isFallback: false },
		] as never)
		vi.mocked(prisma.lead.findMany).mockResolvedValue([
			{ idLead: 10, idLeadFunnelColumn: 2, idUser: 5, name: 'A', lastName: null, email: null, phone: null, originTag: null, outcomeStatus: 'OPEN', idBusiness: 77, user: { name: 'Ana', lastName: 'Torres' } },
			{ idLead: 11, idLeadFunnelColumn: 1, idUser: 5, name: 'B', lastName: null, email: null, phone: null, originTag: null, outcomeStatus: 'OPEN', idBusiness: null, user: null },
		] as never)

		const board = await getLeadBoard(
			{ idUser: 5, role: { code: UserRole.AGENTE } },
			{ visibleUserIds: [5] }
		)

		expect(board).toHaveLength(2)
		const nuevoColumn = board.find((c) => c.idLeadFunnelColumn === 2)
		expect(nuevoColumn?.leads).toHaveLength(1)
		expect(nuevoColumn?.leads[0].idLead).toBe(10)
		expect(nuevoColumn?.leads[0].ownerName).toBe('Ana Torres')
		expect(nuevoColumn?.leads[0].idBusiness).toBe(77)

		const sinMapearColumn = board.find((c) => c.idLeadFunnelColumn === 1)
		expect(sinMapearColumn?.leads[0].ownerName).toBeNull()
		expect(sinMapearColumn?.leads[0].idBusiness).toBeNull()
	})

	it('selects idBusiness in a single query (no extra query per card)', async () => {
		vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([])
		vi.mocked(prisma.lead.findMany).mockResolvedValue([])

		await getLeadBoard({ idUser: 1, role: { code: UserRole.ADMIN } })

		expect(prisma.lead.findMany).toHaveBeenCalledTimes(1)
		const callArgs = vi.mocked(prisma.lead.findMany).mock.calls[0][0]
		expect(callArgs?.select).toEqual(
			expect.objectContaining({ idBusiness: true })
		)
	})

	it('excludes owner-less leads for non-bypass roles', async () => {
		vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([
			{ idLeadFunnelColumn: 1, name: 'Sin mapear', position: 0, isFallback: true },
		] as never)
		vi.mocked(prisma.lead.findMany).mockResolvedValue([])

		await getLeadBoard(
			{ idUser: 5, role: { code: UserRole.AGENTE } },
			{ visibleUserIds: [5] }
		)

		const callArgs = vi.mocked(prisma.lead.findMany).mock.calls[0][0]
		const serialized = JSON.stringify(callArgs?.where)
		expect(serialized).not.toContain('"idUser":null')
	})

	it('threads outcomeStatuses and createdAtRange into the where clause', async () => {
		vi.mocked(prisma.leadFunnelColumn.findMany).mockResolvedValue([])
		vi.mocked(prisma.lead.findMany).mockResolvedValue([])

		const createdAtRange = {
			gte: new Date('2026-08-01T05:00:00.000Z'),
			lte: new Date('2026-08-31T23:59:59.999Z'),
		}

		await getLeadBoard(
			{ idUser: 1, role: { code: UserRole.ADMIN } },
			{ outcomeStatuses: ['WON'], createdAtRange }
		)

		const callArgs = vi.mocked(prisma.lead.findMany).mock.calls[0][0]
		const serialized = JSON.stringify(callArgs?.where)
		expect(serialized).toContain('"outcomeStatus"')
		expect(serialized).toContain('"WON"')
	})
})

describe('getLeadDetail', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns null when the lead is outside the viewer scope', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)

		const result = await getLeadDetail(
			999,
			{ idUser: 5, role: { code: UserRole.AGENTE } },
			{ visibleUserIds: [5] }
		)

		expect(result).toBeNull()
	})
})
