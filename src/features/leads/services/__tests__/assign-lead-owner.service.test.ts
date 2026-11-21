import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import { assignLeadOwner } from '@/features/leads/services/assign-lead-owner.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		lead: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
		leadLink: { findMany: vi.fn() },
		user: { findFirst: vi.fn() },
	},
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	AuditAction: { LEAD_OWNER_ASSIGNED: 'LEAD_OWNER_ASSIGNED' },
	logAuditEvent: vi.fn(),
}))

const ctx = {
	userId: 7,
	email: 'ana@x.co',
	ipAddress: '1.1.1.1',
	userAgent: 'test',
}

const leads = [
	{ idLead: 12, idUser: null, email: 'ana@x.co', phone: '3001111111', identityNumber: null },
	{ idLead: 20, idUser: 4, email: 'ana@x.co', phone: '3001111111', identityNumber: null },
	{ idLead: 21, idUser: null, email: 'otra@x.co', phone: '3009999999', identityNumber: '999' },
]

function installSamePersonGraph() {
	vi.mocked(prisma.lead.findMany).mockImplementation((async (args: { where?: { idLead?: { in?: number[] }; OR?: unknown } }) => {
		const where = args?.where as {
			idLead?: { in?: number[] }
			OR?: Array<Record<string, unknown>>
		}
		if (where?.OR) {
			return leads.filter((lead) => where.idLead?.in?.includes(lead.idLead) && lead.idUser !== 9)
		}
		if (where?.idLead?.in && !where.OR) {
			return leads.filter((lead) => where.idLead?.in?.includes(lead.idLead))
		}
		return leads.filter((lead) => lead.email === 'ana@x.co')
	}) as never)
	vi.mocked(prisma.leadLink.findMany).mockImplementation((async (args: { where?: { OR?: Array<{ idLead?: { in?: number[] } }> } }) => {
		const current = (args?.where as { OR?: Array<{ idLead?: { in?: number[] }; idRelatedLead?: { in?: number[] } }> })
			?.OR?.[0]?.idLead?.in ?? []
		if (!current.includes(20) && !current.includes(12)) return []
		if (current.includes(20) || current.includes(12)) {
			return current.some((id) => id === 12 || id === 20)
				? [{ idLead: 20, idRelatedLead: 21 }]
				: []
		}
		return []
	}) as never)
}

describe('assignLeadOwner', () => {
	beforeEach(() => vi.clearAllMocks())

	it('assigns the Money Strategy to every lead of the same person', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({ idLead: 12 } as never)
		vi.mocked(prisma.user.findFirst).mockResolvedValue({
			idUser: 9,
			name: 'Laura',
			lastName: 'Gomez',
		} as never)
		installSamePersonGraph()

		const result = await assignLeadOwner(12, 9, ctx)

		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.assignedLeadIds.sort((a, b) => a - b)).toEqual([12, 20, 21])
		expect(prisma.lead.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					OR: [{ idUser: null }, { idUser: { not: 9 } }],
				}),
			})
		)
		expect(prisma.lead.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					idLead: { in: [12, 20, 21] },
				}),
				data: expect.objectContaining({ idUser: 9 }),
			})
		)
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: AuditAction.LEAD_OWNER_ASSIGNED,
				details: expect.stringContaining('12, 20, 21'),
			})
		)
	})

	it('rejects an inactive or missing Money Strategy', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({ idLead: 12 } as never)
		vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

		const result = await assignLeadOwner(12, 9, ctx)

		expect(result).toEqual({
			ok: false,
			error: 'El Money Strategy no existe o está inactivo',
		})
		expect(prisma.lead.updateMany).not.toHaveBeenCalled()
	})

	it('does not treat a blank email as the same person', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({ idLead: 12 } as never)
		vi.mocked(prisma.user.findFirst).mockResolvedValue({
			idUser: 9,
			name: 'Laura',
			lastName: null,
		} as never)
		vi.mocked(prisma.lead.findMany).mockImplementation((async (args: { where?: { OR?: unknown; idLead?: { in?: number[] } } }) => {
			const where = args?.where as { OR?: unknown; idLead?: { in?: number[] } }
			if (where?.OR) return [{ idLead: 12, idUser: null }]
			return [{ idLead: 12, idUser: null, email: '   ', phone: null, identityNumber: null }]
		}) as never)
		vi.mocked(prisma.leadLink.findMany).mockResolvedValue([])

		const result = await assignLeadOwner(12, 9, ctx)

		expect(result).toEqual({
			ok: true,
			idUser: 9,
			ownerName: 'Laura',
			assignedLeadIds: [12],
		})
	})
})
