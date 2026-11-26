import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('../../components/HierarchySelectionContext', () => ({
	useHierarchySelection: vi.fn(),
}))
vi.mock('../../components/DashboardFilterContext', () => ({
	useDashboardFilter: vi.fn(),
}))
vi.mock('next-auth/react', () => ({
	useSession: vi.fn(),
}))

import { useSession } from 'next-auth/react'
import { useHierarchySelection } from '../../components/HierarchySelectionContext'
import { useDashboardFilter } from '../../components/DashboardFilterContext'
import { useProductionKpis } from '../../hooks/use-production-kpis'
import { useHeatmapTable } from '../../hooks/use-heatmap-table'
import { useOriginDonut } from '../../hooks/use-origin-donut'
import { useCompanyDonut } from '../../hooks/use-company-donut'
import { useStatusDonut } from '../../hooks/use-status-donut'
import { useMsBarChart } from '../../hooks/use-ms-bar-chart'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

const filters: DashboardAppliedFilters = {
	dateRange: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
	statuses: [],
	categoryIds: [],
	companyIds: [],
	productIds: [],
	originIds: [],
	plazos: [],
	periodicidades: [],
	isInternacional: false,
}

function mockHierarchy(isHierarchyResolved: boolean) {
	vi.mocked(useHierarchySelection).mockReturnValue({
		nodes: [],
		selectedUserIds: [],
		isHierarchyResolved,
		toggle: vi.fn(),
		dispatch: vi.fn(),
	})
}

const hooks = [
	['useProductionKpis', () => useProductionKpis(1)],
	['useHeatmapTable', () => useHeatmapTable(1)],
	['useOriginDonut', () => useOriginDonut()],
	['useCompanyDonut', () => useCompanyDonut()],
	['useStatusDonut', () => useStatusDonut(1)],
	['useMsBarChart', () => useMsBarChart(1)],
] as const

describe('dashboard data hooks wait for the hierarchy', () => {
	const fetchMock = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ data: [] }),
		})
		vi.stubGlobal('fetch', fetchMock)
		vi.mocked(useDashboardFilter).mockReturnValue({
			appliedFilters: filters,
		} as never)
		vi.mocked(useSession).mockReturnValue({
			data: { user: { id: '3' } },
			status: 'authenticated',
		} as never)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it.each(hooks)(
		'%s does not fetch with only the session user while the hierarchy is loading',
		(_name, useHook) => {
			mockHierarchy(false)

			renderHook(() => useHook())

			expect(fetchMock).not.toHaveBeenCalled()
		}
	)

	it.each(hooks)(
		'%s falls back to the session user once the hierarchy resolved empty',
		(_name, useHook) => {
			mockHierarchy(true)

			renderHook(() => useHook())

			expect(fetchMock).toHaveBeenCalledTimes(1)
			expect(String(fetchMock.mock.calls[0][0])).toContain('userIds=3')
		}
	)
})
