/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getAgentDashboardStats } from '../agent.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			count: vi.fn(),
			aggregate: vi.fn(),
		},
	},
}))

describe('getAgentDashboardStats', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should call prisma business count and aggregate with correct filters', async () => {
		const userId = 1
		vi.mocked(prisma.business.count).mockResolvedValue(5)
		vi.mocked(prisma.business.aggregate).mockResolvedValue({ _sum: { value: 1000 } } as any)

		const stats = await getAgentDashboardStats(userId)

		expect(prisma.business.count).toHaveBeenCalledTimes(3)
		expect(prisma.business.aggregate).toHaveBeenCalledTimes(1)
		expect(stats.totalNegocios).toBe(5)
		expect(stats.valorTotal).toBe(1000)
	})
})
