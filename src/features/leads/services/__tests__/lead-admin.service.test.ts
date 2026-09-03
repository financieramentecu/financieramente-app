import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { deleteLead } from '@/features/leads/services/lead-admin.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		lead: {
			findUnique: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	},
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: {
		LEAD_DELETED: 'LEAD_DELETED',
	},
}))

function buildLead(overrides: Record<string, unknown> = {}) {
	return {
		idLead: 1,
		idBusiness: null,
		outcomeStatus: 'OPEN',
		active: true,
		...overrides,
	}
}

describe('deleteLead', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns notFound when the lead does not exist', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)

		const result = await deleteLead(999)

		expect(result.notFound).toBe(true)
		expect(prisma.lead.update).not.toHaveBeenCalled()
	})

	it('returns an error (ineligible) when idBusiness is set', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue(
			buildLead({ idBusiness: 42 }) as never
		)

		const result = await deleteLead(1)

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBeTruthy()
		expect(result.notFound).toBeUndefined()
		expect(prisma.lead.update).not.toHaveBeenCalled()
	})

	it.each(['WON', 'LOST', 'ABANDONED'])(
		'returns an error (ineligible) when outcomeStatus is %s',
		async (outcomeStatus) => {
			vi.mocked(prisma.lead.findUnique).mockResolvedValue(
				buildLead({ outcomeStatus }) as never
			)

			const result = await deleteLead(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBeTruthy()
			expect(prisma.lead.update).not.toHaveBeenCalled()
		}
	)

	it('soft-deletes an eligible lead via update, never delete, and logs LEAD_DELETED', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue(buildLead() as never)
		vi.mocked(prisma.lead.update).mockResolvedValue(
			buildLead({ active: false }) as never
		)

		const result = await deleteLead(1)

		expect(result.data).toEqual({ idLead: 1 })
		expect(prisma.lead.update).toHaveBeenCalledWith({
			where: { idLead: 1 },
			data: { active: false },
		})
		expect(prisma.lead.delete).not.toHaveBeenCalled()
		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.LEAD_DELETED })
		)
	})
})
