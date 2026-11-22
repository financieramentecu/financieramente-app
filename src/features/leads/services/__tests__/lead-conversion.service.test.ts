import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
	getLeadForConversion,
	isLeadWithinConversionScope,
	linkLeadToBusinessTx,
} from '@/features/leads/services/lead-conversion.service'
import { getAccessibleUserIds } from '@/features/auth/lib/hierarchy'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/features/auth/lib/hierarchy', () => ({
	getAccessibleUserIds: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		lead: {
			findFirst: vi.fn(),
		},
	},
}))

describe('getLeadForConversion', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns null (rejects) when the lead is outside the viewer hierarchy', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)

		const result = await getLeadForConversion(
			999,
			{ idUser: 5, role: { code: UserRole.AGENTE } },
			{ visibleUserIds: [5] }
		)

		expect(result).toBeNull()
	})

	it('returns null (rejects) when the lead is already converted', async () => {
		// Simulates the DB query itself excluding converted leads
		vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)

		const result = await getLeadForConversion(
			1,
			{ idUser: 5, role: { code: UserRole.ADMIN } },
			{ visibleUserIds: [] }
		)

		expect(result).toBeNull()
		const callArgs = vi.mocked(prisma.lead.findFirst).mock.calls[0][0]
		expect(JSON.stringify(callArgs?.where)).toContain('idBusiness')
	})

	it('returns the lead when visible and not converted', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({
			idLead: 1,
			idBusiness: null,
			idUser: 5,
			outcomeStatus: 'OPEN',
		} as never)

		const result = await getLeadForConversion(
			1,
			{ idUser: 5, role: { code: UserRole.ADMIN } },
			{ visibleUserIds: [] }
		)

		expect(result?.idLead).toBe(1)
	})

	it('excludes leads without an assigned owner from the DB query (idUser required)', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)

		const result = await getLeadForConversion(
			1,
			{ idUser: 5, role: { code: UserRole.ADMIN } },
			{ visibleUserIds: [] }
		)

		expect(result).toBeNull()
		const callArgs = vi.mocked(prisma.lead.findFirst).mock.calls[0][0]
		expect(JSON.stringify(callArgs?.where)).toContain('"idUser":{"not":null}')
	})

	it('includes the owner (user + role + category) in a single query, for R1 agent defaulting', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({
			idLead: 1,
			idBusiness: null,
			idUser: 5,
			user: {
				idUser: 5,
				name: 'Ana',
				lastName: 'Torres',
				email: 'ana@example.com',
				phone: '3001234567',
				role: { name: 'Agente/Coach' },
				category: { name: 'Junior' },
			},
		} as never)

		await getLeadForConversion(
			1,
			{ idUser: 5, role: { code: UserRole.ADMIN } },
			{ visibleUserIds: [] }
		)

		const callArgs = vi.mocked(prisma.lead.findFirst).mock.calls[0][0]
		expect(callArgs?.include).toEqual({
			user: { include: { role: true, category: true } },
		})
	})
})

describe('isLeadWithinConversionScope', () => {
	beforeEach(() => vi.clearAllMocks())

	it('scopes an advisor to their own branch and never returns a lead outside it', async () => {
		vi.mocked(getAccessibleUserIds).mockResolvedValue([5, 6])
		vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)

		const allowed = await isLeadWithinConversionScope(99, {
			idUser: 5,
			role: { code: UserRole.AGENTE },
		})

		expect(allowed).toBe(false)
		expect(getAccessibleUserIds).toHaveBeenCalledWith(5)
		const where = JSON.stringify(vi.mocked(prisma.lead.findFirst).mock.calls[0][0]?.where)
		expect(where).toContain('"idLead":99')
		expect(where).toContain('"idUser":{"in":[5,6]}')
	})

	it('allows a lead inside the advisor branch', async () => {
		vi.mocked(getAccessibleUserIds).mockResolvedValue([5, 6])
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({ idLead: 3 } as never)

		await expect(
			isLeadWithinConversionScope(3, { idUser: 5, role: { code: UserRole.AGENTE } })
		).resolves.toBe(true)
	})

	it('does not restrict by owner for a write-bypass role', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({ idLead: 3 } as never)

		await expect(
			isLeadWithinConversionScope(3, { idUser: 1, role: { code: UserRole.ADMIN } })
		).resolves.toBe(true)
		expect(getAccessibleUserIds).not.toHaveBeenCalled()
		const where = JSON.stringify(vi.mocked(prisma.lead.findFirst).mock.calls[0][0]?.where)
		expect(where).not.toContain('"idUser":{"in"')
	})

	it('keeps converted and ownerless leads in scope so the link step reports its own error', async () => {
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({ idLead: 3 } as never)

		await isLeadWithinConversionScope(3, { idUser: 1, role: { code: UserRole.ADMIN } })

		const where = JSON.stringify(vi.mocked(prisma.lead.findFirst).mock.calls[0][0]?.where)
		expect(where).not.toContain('idBusiness')
	})
})

describe('linkLeadToBusinessTx', () => {
	it('throws (rolling back the transaction) when the lead has no owner', async () => {
		const tx = {
			lead: {
				findUnique: vi.fn().mockResolvedValue({
					idLead: 1,
					idBusiness: null,
					idUser: null,
					active: true,
					outcomeStatus: 'OPEN',
				}),
				update: vi.fn(),
			},
		}

		await expect(linkLeadToBusinessTx(tx as never, 1, 55)).rejects.toThrow()
		expect(tx.lead.update).not.toHaveBeenCalled()
	})

	it('throws (rolling back the transaction) when the lead was converted concurrently', async () => {
		const tx = {
			lead: {
				findUnique: vi.fn().mockResolvedValue({
					idLead: 1,
					idBusiness: 99,
					active: true,
					outcomeStatus: 'WON',
				}),
				update: vi.fn(),
			},
		}

		await expect(
			linkLeadToBusinessTx(tx as never, 1, 55)
		).rejects.toThrow()
		expect(tx.lead.update).not.toHaveBeenCalled()
	})

	it('links the lead to the business when still unconverted', async () => {
		const tx = {
			lead: {
				findUnique: vi.fn().mockResolvedValue({
					idLead: 1,
					idBusiness: null,
					idUser: 5,
					active: true,
					outcomeStatus: 'OPEN',
				}),
				update: vi.fn().mockResolvedValue({}),
			},
		}

		await linkLeadToBusinessTx(tx as never, 1, 55)

		expect(tx.lead.update).toHaveBeenCalledWith({
			where: { idLead: 1 },
			data: { idBusiness: 55 },
		})
	})
})
