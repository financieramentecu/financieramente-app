import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { relateLead } from '@/features/leads/services/relate-lead.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		lead: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		clientOrigin: { findFirst: vi.fn() },
		leadLink: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
		leadChangeHistory: { createMany: vi.fn() },
		leadClientOrigin: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
		user: { findFirst: vi.fn() },
		$transaction: vi.fn(),
	},
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { LEAD_RELATED: 'LEAD_RELATED' },
}))

vi.mock('@/features/leads/services/lead-origin.service', () => ({
	assignLeadOrigin: vi.fn().mockResolvedValue('created'),
}))

vi.mock('@/features/leads/services/record-lead-change.service', () => ({
	recordOwnerChange: vi.fn().mockResolvedValue(undefined),
}))

const ctx = { userId: 3, email: 'ana@financieramente.com' }

describe('relateLead', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({
			originTag: null,
		} as never)
		vi.mocked(prisma.leadLink.findMany).mockResolvedValue([])
		vi.mocked(prisma.lead.findMany)
			.mockResolvedValueOnce([
				{ idLead: 240, idUser: null },
				{ idLead: 239, idUser: 15 },
			] as never)
			.mockResolvedValue([{ idLead: 240, user: null }] as never)
		vi.mocked(prisma.$transaction).mockImplementation(async (fn) =>
			(fn as (tx: typeof prisma) => Promise<unknown>)(prisma)
		)
	})

	it('returns a generic409 on conflicting group owners before writing', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({
			idLead: 240,
			active: true,
		} as never)
		vi.mocked(prisma.leadLink.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.lead.findMany)
			.mockReset()
			.mockResolvedValue([
				{ idLead: 240, idUser: 8 },
				{ idLead: 239, idUser: 15 },
			] as never)
		expect(await relateLead(240, 239, null, ctx, [])).toMatchObject({
			ok: false,
			status: 409,
			error: 'No fue posible modificar el grupo relacionado',
		})
		expect(prisma.leadLink.create).not.toHaveBeenCalled()
		expect(prisma.lead.updateMany).not.toHaveBeenCalled()
	})
	it('preserves an origin assigned between the initial read and transaction', async () => {
		vi.mocked(prisma.lead.findFirst)
			.mockResolvedValueOnce({ idLead: 240, originTag: null } as never)
			.mockResolvedValueOnce({ idLead: 239, idUser: 15 } as never)
			.mockResolvedValueOnce({ originTag: 'Concurrent first source' } as never)
		vi.mocked(prisma.clientOrigin.findFirst).mockResolvedValue({
			idClientOrigin: 4,
			name: 'New source',
			status: true,
		} as never)
		vi.mocked(prisma.leadLink.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.leadLink.create).mockResolvedValue({
			idLeadLink: 1,
			linkedAt: new Date(),
		} as never)
		vi.mocked(prisma.user.findFirst).mockResolvedValue({
			name: 'Ana',
			lastName: null,
		} as never)
		expect((await relateLead(240, 239, 4, ctx, [])).ok).toBe(true)
		expect(prisma.lead.update).not.toHaveBeenCalled()
		expect(prisma.lead.findFirst).toHaveBeenLastCalledWith({
			where: { idLead: 240, active: true },
			select: { originTag: true },
		})
	})
	it('rejects a lead related to itself', async () => {
		const result = await relateLead(8, 8, 4, ctx, [])
		expect(result).toEqual({
			ok: false,
			error: 'Un lead no se puede relacionar consigo mismo',
		})
	})

	it('copies the related advisor and stores a manual link', async () => {
		vi.mocked(prisma.lead.findFirst)
			.mockResolvedValueOnce({
				idLead: 240,
				name: 'Camilo',
				lastName: 'Restrepo',
				originTag: null,
				idUser: null,
				active: true,
			} as never)
			.mockResolvedValueOnce({
				idLead: 239,
				name: 'Danna',
				lastName: 'Guzman',
				originTag: 'Money Strategy',
				idUser: 15,
				active: true,
			} as never)
		vi.mocked(prisma.clientOrigin.findFirst).mockResolvedValue({
			idClientOrigin: 4,
			name: 'Money Strategy',
			status: true,
		} as never)
		vi.mocked(prisma.leadLink.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.leadLink.create).mockResolvedValue({
			idLeadLink: 1,
			linkedAt: new Date('2026-11-20T16:00:00.000Z'),
		} as never)
		vi.mocked(prisma.leadClientOrigin.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.user.findFirst).mockResolvedValue({
			name: 'Ana',
			lastName: 'Torres',
		} as never)

		const result = await relateLead(240, 239, 4, ctx, [])

		expect(result.ok).toBe(true)
		expect(prisma.lead.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ idUser: 15 }) })
		)
		expect(prisma.leadLink.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					idLead: 240,
					idRelatedLead: 239,
					idClientOrigin: 4,
					source: 'MANUAL',
					linkedBy: 3,
				}),
			})
		)
		if (result.ok) {
			expect(result.ownerName).toBe('Ana Torres')
			expect(result.relation.otherName).toBe('Danna Guzman')
		}
	})

	it('links without an origin when none is provided', async () => {
		vi.mocked(prisma.lead.findFirst)
			.mockResolvedValueOnce({
				idLead: 240,
				name: 'Camilo',
				lastName: 'Restrepo',
				originTag: null,
				idUser: null,
				active: true,
			} as never)
			.mockResolvedValueOnce({
				idLead: 239,
				name: 'Danna',
				lastName: 'Guzman',
				originTag: 'Money Strategy',
				idUser: 15,
				active: true,
			} as never)
		vi.mocked(prisma.leadLink.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.leadLink.create).mockResolvedValue({
			idLeadLink: 2,
			linkedAt: new Date('2026-11-20T16:00:00.000Z'),
		} as never)
		vi.mocked(prisma.user.findFirst).mockResolvedValue({
			name: 'Ana',
			lastName: 'Torres',
		} as never)

		const result = await relateLead(240, 239, null, ctx, [])

		expect(result.ok).toBe(true)
		expect(prisma.clientOrigin.findFirst).not.toHaveBeenCalled()
		expect(prisma.leadLink.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					idLead: 240,
					idRelatedLead: 239,
					idClientOrigin: null,
					source: 'MANUAL',
				}),
			})
		)
		if (result.ok) {
			expect(result.relation.originName).toBe('Sin origen')
		}
	})
})
