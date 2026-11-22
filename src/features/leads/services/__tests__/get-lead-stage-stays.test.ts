import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getLeadStageStays } from '@/features/leads/services/lead-stage-history.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		lead: {
			findUnique: vi.fn(),
		},
	},
}))

vi.mock('@sentry/nextjs', () => ({
	captureException: vi.fn(),
}))

const CREATED_AT = new Date('2026-11-01T20:00:00.000Z')
const MOVED_AT = new Date('2026-11-08T15:30:00.000Z')
const NOW = new Date('2026-11-10T20:43:00.000Z')

describe('getLeadStageStays', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns an empty list when the lead does not exist', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)
		await expect(getLeadStageStays(232, NOW)).resolves.toEqual([])
	})

	it('maps stage changes into closed and open stays', async () => {
		vi.mocked(prisma.lead.findUnique).mockResolvedValue({
			createdAt: CREATED_AT,
			funnelColumn: { name: 'Contacto 1ra Vez' },
			stageHistory: [
				{
					changedAt: CREATED_AT,
					fromColumn: null,
					toColumn: { name: 'Lead Nuevo' },
				},
				{
					changedAt: MOVED_AT,
					fromColumn: { name: 'Lead Nuevo' },
					toColumn: { name: 'Contacto 1ra Vez' },
				},
			],
		} as never)

		const stays = await getLeadStageStays(232, NOW)

		expect(stays).toEqual([
			{
				columnName: 'Lead Nuevo',
				enteredAt: CREATED_AT.toISOString(),
				leftAt: MOVED_AT.toISOString(),
				durationMs: MOVED_AT.getTime() - CREATED_AT.getTime(),
				current: false,
			},
			{
				columnName: 'Contacto 1ra Vez',
				enteredAt: MOVED_AT.toISOString(),
				leftAt: null,
				durationMs: NOW.getTime() - MOVED_AT.getTime(),
				current: true,
			},
		])
	})
})
