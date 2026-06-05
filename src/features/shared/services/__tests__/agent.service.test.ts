/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getAgentDashboardStats, listActiveAgents } from '../agent.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			count: vi.fn(),
			aggregate: vi.fn(),
		},
		clawbackBalance: {
			findUnique: vi.fn(),
		},
		user: {
			findMany: vi.fn(),
		},
	},
}))

vi.mock('@/features/auth/lib/hierarchy', () => ({
	getAccessibleUserIds: vi.fn(),
}))

describe('getAgentDashboardStats', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should call prisma business count and aggregate with correct filters', async () => {
		const userId = 1
		vi.mocked(prisma.clawbackBalance.findUnique).mockResolvedValue({ totalAmount: 500 } as any)
		vi.mocked(prisma.business.count).mockResolvedValue(5)
		vi.mocked(prisma.business.aggregate).mockResolvedValue({ _sum: { value: 1000 } } as any)

		const stats = await getAgentDashboardStats(userId)

		expect(prisma.business.count).toHaveBeenCalledTimes(6)
		expect(prisma.business.aggregate).toHaveBeenCalledTimes(2)
		expect(stats.totalNegocios).toBe(5)
		expect(stats.valorTotal).toBe(1000)
	})
})

describe('listActiveAgents', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	const mockUsers = [
		{ idUser: 10, name: 'Ana', lastName: 'García' },
		{ idUser: 11, name: 'Luis', lastName: 'Pérez' },
	]

	it('returns all active AGENTEs and showFilter=true for ADMIN', async () => {
		vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

		const result = await listActiveAgents({ idUser: 1, roleCode: 'ADMIN', levelCode: 'LEVEL_3' })

		expect(result.showFilter).toBe(true)
		expect(result.agents).toHaveLength(2)
		expect(result.agents[0]).toEqual({ id: 10, name: 'Ana', lastName: 'García' })
		expect(prisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { active: true, role: { code: 'AGENTE' } } })
		)
	})

	it('returns all active AGENTEs and showFilter=true for ASISTENTE_GERENCIA_OPERATIVA', async () => {
		vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

		const result = await listActiveAgents({ idUser: 2, roleCode: 'ASISTENTE_GERENCIA_OPERATIVA', levelCode: null })

		expect(result.showFilter).toBe(true)
		expect(result.agents).toHaveLength(2)
	})

	it('returns showFilter=false and empty agents for LEVEL_0 (MS Junior)', async () => {
		const result = await listActiveAgents({ idUser: 5, roleCode: 'AGENTE', levelCode: 'LEVEL_0' })

		expect(result.showFilter).toBe(false)
		expect(result.agents).toHaveLength(0)
		expect(prisma.user.findMany).not.toHaveBeenCalled()
	})

	it('returns scoped tree agents for AGENTE with subordinates', async () => {
		const { getAccessibleUserIds } = await import('@/features/auth/lib/hierarchy')
		vi.mocked(getAccessibleUserIds).mockResolvedValue([5, 10, 11])

		vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

		const result = await listActiveAgents({ idUser: 5, roleCode: 'AGENTE', levelCode: 'LEVEL_2' })

		expect(result.showFilter).toBe(true)
		expect(getAccessibleUserIds).toHaveBeenCalledWith(5)
		expect(prisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ idUser: { in: [10, 11] } }),
			})
		)
	})

	it('returns showFilter=false when AGENTE has no subordinates', async () => {
		const { getAccessibleUserIds } = await import('@/features/auth/lib/hierarchy')
		vi.mocked(getAccessibleUserIds).mockResolvedValue([5])

		const result = await listActiveAgents({ idUser: 5, roleCode: 'AGENTE', levelCode: 'LEVEL_1' })

		expect(result.showFilter).toBe(false)
		expect(result.agents).toHaveLength(0)
		expect(prisma.user.findMany).not.toHaveBeenCalled()
	})
})
