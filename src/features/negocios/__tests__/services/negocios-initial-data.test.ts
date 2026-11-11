import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/negocios/services/user-hierarchy.service', () => ({
	resolveVisibleUserIds: vi.fn(),
}))
vi.mock('@/features/negocios/services/business-list.service', () => ({
	listBusinesses: vi.fn(),
}))
vi.mock('@/features/negocios/services/business-stats.service', () => ({
	getBusinessStats: vi.fn(),
}))

import { getNegociosInitialData } from '@/features/negocios/services/negocios-initial-data.server'
import { resolveVisibleUserIds } from '@/features/negocios/services/user-hierarchy.service'
import { listBusinesses } from '@/features/negocios/services/business-list.service'
import { getBusinessStats } from '@/features/negocios/services/business-stats.service'

const user = { idUser: 7, role: { code: 'AGENTE' } }
const list = { businesses: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }
const stats = { ventasEfectuadas: {}, emitidos: {}, fondeados: {} }

describe('getNegociosInitialData', () => {
	const mockVisibility = vi.mocked(resolveVisibleUserIds)
	const mockList = vi.mocked(listBusinesses)
	const mockStats = vi.mocked(getBusinessStats)

	beforeEach(() => {
		vi.clearAllMocks()
		mockVisibility.mockResolvedValue([7, 8])
		mockList.mockResolvedValue(list as never)
		mockStats.mockResolvedValue(stats as never)
	})

	it('resolves the visibility scope once and shares it with list and stats', async () => {
		const result = await getNegociosInitialData(
			user,
			new URLSearchParams('createdFrom=2026-03-01&createdTo=2026-03-15&statuses=EMITIDO')
		)

		expect(mockVisibility).toHaveBeenCalledTimes(1)
		expect(mockList.mock.calls[0][3]).toEqual([7, 8])
		expect(mockStats.mock.calls[0][3]).toEqual({ visibleUserIds: [7, 8] })
		expect(result.list).toBe(list)
		expect(result.stats).toBe(stats)
		expect(result.renderId).toEqual(expect.any(String))
	})

	it('requests the first page with the URL filters, like the client does on mount', async () => {
		await getNegociosInitialData(
			user,
			new URLSearchParams('createdFrom=2026-03-01&createdTo=2026-03-15&statuses=EMITIDO')
		)

		expect(mockList.mock.calls[0][2]).toMatchObject({
			page: 1,
			pageSize: 10,
			createdFrom: '2026-03-01',
			createdTo: '2026-03-15',
			statuses: ['EMITIDO'],
		})
		expect(mockStats.mock.calls[0][2]).toMatchObject({
			createdFrom: '2026-03-01',
			createdTo: '2026-03-15',
			statuses: ['EMITIDO'],
		})
	})

	it('drops a half date range from the list but leaves stats to the client', async () => {
		const result = await getNegociosInitialData(
			user,
			new URLSearchParams('createdFrom=2026-03-01')
		)

		expect(mockList.mock.calls[0][2].createdFrom).toBeUndefined()
		// Stats receive the raw half range, which fails validation: the client
		// fetches and shows the API error exactly as before.
		expect(mockStats).not.toHaveBeenCalled()
		expect(result.stats).toBeNull()
	})

	it('returns null for the part that fails so the client can fetch it', async () => {
		mockStats.mockRejectedValue(new Error('db down'))

		const result = await getNegociosInitialData(user, new URLSearchParams())

		expect(result.list).toBe(list)
		expect(result.stats).toBeNull()
	})

	it('returns nulls when the visibility lookup fails', async () => {
		mockVisibility.mockRejectedValue(new Error('db down'))

		const result = await getNegociosInitialData(user, new URLSearchParams())

		expect(result).toMatchObject({ list: null, stats: null })
	})
})
