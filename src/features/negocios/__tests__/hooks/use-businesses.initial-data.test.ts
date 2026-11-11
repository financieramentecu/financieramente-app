import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBusinesses } from '../../hooks/use-businesses'
import { useBusinessStats } from '../../hooks/use-business-stats'
import { businessService } from '../../services/business.service'
import type { BusinessEntity } from '../../types/business-entity.types'
import type {
	BusinessListResponse,
	CoachKpiResponse,
} from '../../types/business-api.types'

vi.mock('../../services/business.service', () => ({
	businessService: { getAll: vi.fn(), getStats: vi.fn() },
}))

function listOf(id: number): BusinessListResponse {
	return {
		businesses: [{ id } as unknown as BusinessEntity],
		pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
	}
}

function statsOf(count: number): CoachKpiResponse {
	return {
		ventasEfectuadas: { count, totalCop: 0, totalUsd: 0 },
		emitidos: { count: 0, totalCop: 0, totalUsd: 0, sinSoporte: 0 },
		fondeados: { count: 0, totalCop: 0, totalUsd: 0 },
	}
}

describe('useBusinesses with server initial data', () => {
	const mockGetAll = vi.mocked(businessService.getAll)

	beforeEach(() => {
		vi.clearAllMocks()
		mockGetAll.mockResolvedValue({ data: listOf(2) })
	})

	it('renders the initial data without fetching on mount', () => {
		const { result } = renderHook(() =>
			useBusinesses({ page: 1 }, { data: listOf(1), renderId: 'list-a' })
		)

		expect(result.current.isLoading).toBe(false)
		expect(result.current.businesses[0].id).toBe(1)
		expect(mockGetAll).not.toHaveBeenCalled()
	})

	it('fetches when the params change after mount', async () => {
		const { result, rerender } = renderHook(
			({ page }: { page: number }) =>
				useBusinesses({ page }, { data: listOf(1), renderId: 'list-b' }),
			{ initialProps: { page: 1 } }
		)

		rerender({ page: 2 })

		await waitFor(() => expect(result.current.businesses[0].id).toBe(2))
		expect(mockGetAll).toHaveBeenCalledTimes(1)
	})

	it('revalidates in the background when the same server render is mounted again', async () => {
		const initial = { data: listOf(1), renderId: 'list-c' }
		renderHook(() => useBusinesses({ page: 1 }, initial)).unmount()
		expect(mockGetAll).not.toHaveBeenCalled()

		const { result } = renderHook(() => useBusinesses({ page: 1 }, initial))

		// Stale data stays visible (no loading flash) while the refetch runs.
		expect(result.current.isLoading).toBe(false)
		expect(result.current.businesses[0].id).toBe(1)
		await waitFor(() => expect(result.current.businesses[0].id).toBe(2))
	})

	it('still fetches on mount when there is no initial data', async () => {
		const { result } = renderHook(() => useBusinesses({ page: 1 }))

		expect(result.current.isLoading).toBe(true)
		await waitFor(() => expect(result.current.businesses[0].id).toBe(2))
	})
})

describe('useBusinessStats with server initial data', () => {
	const mockGetStats = vi.mocked(businessService.getStats)

	beforeEach(() => {
		vi.clearAllMocks()
		mockGetStats.mockResolvedValue({ data: statsOf(9) })
	})

	it('renders the initial data without fetching on mount', () => {
		const { result } = renderHook(() =>
			useBusinessStats({}, { data: statsOf(4), renderId: 'stats-a' })
		)

		expect(result.current.isLoading).toBe(false)
		expect(result.current.stats?.ventasEfectuadas.count).toBe(4)
		expect(mockGetStats).not.toHaveBeenCalled()
	})

	it('fetches when the filters change after mount', async () => {
		const { result, rerender } = renderHook(
			({ agentName }: { agentName?: string }) =>
				useBusinessStats({ agentName }, { data: statsOf(4), renderId: 'stats-b' }),
			{ initialProps: {} as { agentName?: string } }
		)

		rerender({ agentName: 'Ana' })

		await waitFor(() =>
			expect(result.current.stats?.ventasEfectuadas.count).toBe(9)
		)
		expect(mockGetStats).toHaveBeenCalledTimes(1)
	})
})
