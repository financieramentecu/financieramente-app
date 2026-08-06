import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { HierarchyTreeData } from '@/features/production-dashboard/types/hierarchy.types'

// Heavy leaf panels — irrelevant to the layout behavior under test, mocked to
// keep this test focused and avoid pulling in their own network/chart deps.
vi.mock('@/features/production-dashboard/components/DashboardFilterPanel', () => ({
	DashboardFilterPanel: () => <div data-testid="filter-panel" />,
}))
vi.mock('@/features/production-dashboard/components/UsdKpiPanel', () => ({
	UsdKpiPanel: () => <div data-testid="kpi-panel" />,
}))
vi.mock('@/features/production-dashboard/components/MsGroupedBarChart', () => ({
	MsGroupedBarChart: () => <div data-testid="bar-chart" />,
}))
vi.mock('@/features/production-dashboard/components/HeatmapTablePanel', () => ({
	HeatmapTablePanel: () => <div data-testid="heatmap-panel" />,
}))
vi.mock('@/features/production-dashboard/components/OriginDonutPanel', () => ({
	OriginDonutPanel: () => <div data-testid="origin-donut" />,
}))
vi.mock('@/features/production-dashboard/components/CompanyDonutPanel', () => ({
	CompanyDonutPanel: () => <div data-testid="company-donut" />,
}))
vi.mock('@/features/production-dashboard/components/StatusDonutPanel', () => ({
	StatusDonutPanel: () => <div data-testid="status-donut" />,
}))
vi.mock('@/features/production-dashboard/hooks/use-trm', () => ({
	useTrm: () => ({
		isLoading: false,
		trmRate: 4000,
		trmState: { status: 'success', data: 4000, error: '' },
		isManual: false,
		error: null,
		setManualTrm: vi.fn(),
	}),
}))
vi.mock('@/features/production-dashboard/hooks/use-ms-bar-chart', () => ({
	useMsBarChart: () => ({ status: 'success', data: [], error: '' }),
}))
vi.mock('@/features/production-dashboard/hooks/use-hierarchy-tree', () => ({
	useHierarchyTree: vi.fn(),
}))

// Imports AFTER vi.mock declarations (hoisted by Vitest)
import { useHierarchyTree } from '@/features/production-dashboard/hooks/use-hierarchy-tree'
import { DashboardShell } from '@/features/production-dashboard/components/DashboardShell'

const mockUseHierarchyTree = vi.mocked(useHierarchyTree)

function successState(nodes: HierarchyTreeData['nodes']): ReturnType<typeof useHierarchyTree> {
	return {
		state: { status: 'success', data: { nodes }, error: '' } satisfies AsyncState<HierarchyTreeData>,
		refetch: vi.fn(),
	}
}

describe('DashboardShell — hierarchy sidebar width', () => {
	it('collapses the hierarchy sidebar to zero width when the user has no hierarchy/tree', async () => {
		mockUseHierarchyTree.mockReturnValue(successState([]))

		render(<DashboardShell />)

		await waitFor(() => {
			const aside = screen.getByTestId('hierarchy-sidebar')
			expect(aside).toHaveStyle({ width: '0px' })
		})
	})

	it('keeps the sidebar reserved at its normal width when the user has a hierarchy/tree', async () => {
		mockUseHierarchyTree.mockReturnValue(
			successState([
				{
					userId: 1,
					fullName: 'Leader',
					levelCode: 'TEAM_LEADER',
					levelColor: '#000',
					categoryName: 'X',
					idCategory: null,
					included: true,
					children: [],
				},
			])
		)

		render(<DashboardShell />)

		await waitFor(() => {
			const aside = screen.getByTestId('hierarchy-sidebar')
			expect(aside).toHaveStyle({ width: '288px' })
		})
	})
})
