import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { moveLeadToStage } from '@/features/leads/services/move-lead-stage.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadFunnelColumn: { findFirst: vi.fn() },
		lead: { findFirst: vi.fn() },
		$transaction: vi.fn(),
	},
}))
vi.mock('@/features/auth/lib/audit-logger', () => ({
	AuditAction: { LEAD_STATUS_CHANGED: 'LEAD_STATUS_CHANGED' },
	logAuditEvent: vi.fn(),
}))

const ctx = { userId: 7, email: 'ana@x.co', ipAddress: '1.1.1.1', userAgent: 'test' }

describe('moveLeadToStage', () => {
	beforeEach(() => vi.clearAllMocks())

	it('records a manual stage change for the acting user', async () => {
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue({ idLeadFunnelColumn: 2, name: 'Contactado' } as never)
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({
			idLeadFunnelColumn: 1,
			funnelColumn: { name: 'Nuevo' },
		} as never)
		const update = vi.fn()
		const create = vi.fn()
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
			(callback as (tx: unknown) => Promise<unknown>)({
				lead: { update },
				leadStageHistory: { create },
			})
		)

		const result = await moveLeadToStage(12, 2, ctx)

		expect(result).toEqual({ ok: true })
		expect(update).toHaveBeenCalledWith(expect.objectContaining({
			where: { idLead: 12 },
			data: expect.objectContaining({ idLeadFunnelColumn: 2 }),
		}))
		expect(create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				idLead: 12,
				fromIdLeadFunnelColumn: 1,
				toIdLeadFunnelColumn: 2,
				source: 'MANUAL',
				idUser: 7,
			}),
		})
		expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, action: 'LEAD_STATUS_CHANGED' }))
	})

	it('rejects an inactive column', async () => {
		vi.mocked(prisma.leadFunnelColumn.findFirst).mockResolvedValue(null)
		vi.mocked(prisma.lead.findFirst).mockResolvedValue({ idLeadFunnelColumn: 1, funnelColumn: { name: 'Nuevo' } } as never)
		await expect(moveLeadToStage(12, 9, ctx)).resolves.toEqual({ ok: false, error: 'La etapa no existe o está inactiva' })
		expect(prisma.$transaction).not.toHaveBeenCalled()
	})
})
