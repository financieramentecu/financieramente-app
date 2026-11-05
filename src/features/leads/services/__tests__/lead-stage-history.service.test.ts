import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { recordLeadStageChange } from '@/features/leads/services/lead-stage-history.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		leadStageHistory: {
			create: vi.fn(),
		},
	},
}))

vi.mock('@sentry/nextjs', () => ({
	captureException: vi.fn(),
}))

const CHANGED_AT = new Date('2026-08-01T10:00:00Z')

describe('recordLeadStageChange', () => {
	beforeEach(() => vi.clearAllMocks())

	it('inserts a history row when the column changes', async () => {
		await recordLeadStageChange({
			idLead: 10,
			fromIdLeadFunnelColumn: 1,
			toIdLeadFunnelColumn: 5,
			source: 'CRM_SYNC',
			changedAt: CHANGED_AT,
		})

		expect(prisma.leadStageHistory.create).toHaveBeenCalledWith({
			data: {
				idLead: 10,
				fromIdLeadFunnelColumn: 1,
				toIdLeadFunnelColumn: 5,
				source: 'CRM_SYNC',
				idUser: null,
				changedAt: CHANGED_AT,
			},
		})
	})

	it('stores null as origin for a new lead and keeps the acting user', async () => {
		await recordLeadStageChange({
			idLead: 10,
			fromIdLeadFunnelColumn: undefined,
			toIdLeadFunnelColumn: 3,
			source: 'CSV_IMPORT',
			idUser: 7,
			changedAt: CHANGED_AT,
		})

		expect(prisma.leadStageHistory.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				fromIdLeadFunnelColumn: null,
				idUser: 7,
				source: 'CSV_IMPORT',
			}),
		})
	})

	it('does not insert when the column is unchanged', async () => {
		await recordLeadStageChange({
			idLead: 10,
			fromIdLeadFunnelColumn: 5,
			toIdLeadFunnelColumn: 5,
			source: 'CRM_SYNC',
			changedAt: CHANGED_AT,
		})

		expect(prisma.leadStageHistory.create).not.toHaveBeenCalled()
	})

	it('reports failures to Sentry without throwing', async () => {
		const error = new Error('db down')
		vi.mocked(prisma.leadStageHistory.create).mockRejectedValue(error)

		await expect(
			recordLeadStageChange({
				idLead: 10,
				fromIdLeadFunnelColumn: 1,
				toIdLeadFunnelColumn: 5,
				source: 'CRM_SYNC',
				changedAt: CHANGED_AT,
			})
		).resolves.toBeUndefined()
		expect(Sentry.captureException).toHaveBeenCalledWith(error)
	})
})
