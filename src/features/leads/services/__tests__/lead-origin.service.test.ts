import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
	assignLeadOrigin,
	resolveLeadOrigin,
} from '@/features/leads/services/lead-origin.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadOrigin: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
		},
		leadOriginAssignment: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
			update: vi.fn(),
		},
	},
}))

const seenAt = new Date('2026-11-19T15:00:00.000Z')

describe('resolveLeadOrigin', () => {
	beforeEach(() => vi.clearAllMocks())

	it('does nothing when utm_source is absent or blank', async () => {
		await expect(resolveLeadOrigin(undefined)).resolves.toEqual({
			status: 'absent',
		})
		await expect(resolveLeadOrigin('   ')).resolves.toEqual({
			status: 'absent',
		})
		expect(prisma.leadOrigin.findUnique).not.toHaveBeenCalled()
	})

	it('returns the existing active catalogue row without renaming it', async () => {
		vi.mocked(prisma.leadOrigin.findUnique).mockResolvedValue({
			idLeadOrigin: 4,
			code: 'money_map',
			name: 'Money Map',
			status: true,
		} as never)

		await expect(resolveLeadOrigin('money-map')).resolves.toEqual({
			status: 'ready',
			idLeadOrigin: 4,
			code: 'money_map',
			name: 'Money Map',
			createdCatalog: false,
		})
		expect(prisma.leadOrigin.upsert).not.toHaveBeenCalled()
	})

	it('refuses an inactive catalogue row', async () => {
		vi.mocked(prisma.leadOrigin.findUnique).mockResolvedValue({
			idLeadOrigin: 4,
			code: 'money_map',
			name: 'Money Map',
			status: false,
		} as never)

		await expect(resolveLeadOrigin('Money Map')).resolves.toEqual({
			status: 'inactive',
			code: 'money_map',
		})
	})

	it('creates the catalogue row from the incoming value', async () => {
		vi.mocked(prisma.leadOrigin.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.leadOrigin.upsert).mockResolvedValue({
			idLeadOrigin: 8,
			code: 'money_flow',
			name: 'Money Flow',
			status: true,
		} as never)

		await expect(resolveLeadOrigin('money_flow')).resolves.toEqual({
			status: 'ready',
			idLeadOrigin: 8,
			code: 'money_flow',
			name: 'Money Flow',
			createdCatalog: true,
		})
		expect(prisma.leadOrigin.upsert).toHaveBeenCalledWith({
			where: { code: 'money_flow' },
			create: { code: 'money_flow', name: 'Money Flow', status: true },
			update: { code: 'money_flow' },
		})
	})
})

describe('assignLeadOrigin', () => {
	beforeEach(() => vi.clearAllMocks())

	it('inserts the pivot when the lead has not seen this origin', async () => {
		vi.mocked(prisma.leadOriginAssignment.findUnique).mockResolvedValue(null)

		await expect(
			assignLeadOrigin({ idLead: 10, idLeadOrigin: 4, seenAt })
		).resolves.toBe('created')

		expect(prisma.leadOriginAssignment.upsert).toHaveBeenCalledWith({
			where: { idLead_idLeadOrigin: { idLead: 10, idLeadOrigin: 4 } },
			update: { active: true, lastSeenAt: seenAt },
			create: {
				idLead: 10,
				idLeadOrigin: 4,
				active: true,
				firstSeenAt: seenAt,
				lastSeenAt: seenAt,
			},
		})
	})

	it('reactivates a removed pivot row', async () => {
		vi.mocked(prisma.leadOriginAssignment.findUnique).mockResolvedValue({
			idLeadOriginAssignment: 3,
			active: false,
		} as never)

		await expect(
			assignLeadOrigin({ idLead: 10, idLeadOrigin: 4, seenAt })
		).resolves.toBe('reactivated')
	})

	it('only refreshes lastSeenAt when the pivot is already active', async () => {
		vi.mocked(prisma.leadOriginAssignment.findUnique).mockResolvedValue({
			idLeadOriginAssignment: 3,
			active: true,
		} as never)

		await expect(
			assignLeadOrigin({ idLead: 10, idLeadOrigin: 4, seenAt })
		).resolves.toBe('refreshed')
		expect(prisma.leadOriginAssignment.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idLead_idLeadOrigin: { idLead: 10, idLeadOrigin: 4 } },
				update: { active: true, lastSeenAt: seenAt },
			})
		)
	})
})
