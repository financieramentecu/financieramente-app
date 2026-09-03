import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import { ABA_MFUND_FILTER_ACTION } from '../types/filter.types'
import { ABA_MFUND_UI } from '../lib/ui-copy'

vi.mock('@/features/production-dashboard/components/HierarchySelectionContext', () => ({
	useHierarchySelection: vi.fn(),
}))

vi.mock(
	'@/features/reports/aba-mfund/components/aba-mfund-filter-context',
	async () => {
		const { ABA_MFUND_FILTER_ACTION } = await import('../types/filter.types')
		return {
			useAbaMfundFilter: vi.fn(),
			ABA_MFUND_FILTER_ACTION,
		}
	}
)

vi.mock('@/features/production-dashboard/components/filters/MonthRangePicker', () => ({
	MonthRangePicker: () => <div data-testid="month-range-picker" />,
}))

vi.mock('@/features/production-dashboard/components/filters/MultiSelectFilter', () => ({
	MultiSelectFilter: ({ todasLabel }: { todasLabel: string }) => (
		<div data-testid="status-filter">{todasLabel}</div>
	),
}))

import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { useAbaMfundFilter } from '@/features/reports/aba-mfund/components/aba-mfund-filter-context'
import { AbaMfundFilterBar } from '../components/aba-mfund-filter-bar'

const mockUseHierarchySelection = vi.mocked(useHierarchySelection)
const mockUseAbaMfundFilter = vi.mocked(useAbaMfundFilter)

describe('AbaMfundFilterBar', () => {
	const filterDispatch = vi.fn()
	const hierarchyDispatch = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		mockUseHierarchySelection.mockReturnValue({
			selectedUserIds: [1],
			nodes: [],
			toggle: vi.fn(),
			dispatch: hierarchyDispatch,
		} as never)
		mockUseAbaMfundFilter.mockReturnValue({
			draft: {
				dateFrom: '2026-08-01',
				dateTo: '2026-08-31',
				statuses: [BUSINESS_STATUS.FONDEADO],
			},
			applied: {
				dateFrom: '2026-07-01',
				dateTo: '2026-07-31',
				statuses: [BUSINESS_STATUS.FONDEADO],
			},
			dispatch: filterDispatch,
			isApplyEnabled: true,
			dateRangeError: undefined,
		})
	})

	it('shows Estado Todos label and does not query until Aplicar', () => {
		render(<AbaMfundFilterBar onExportExcel={vi.fn()} isExporting={false} />)

		expect(screen.getByTestId('status-filter')).toHaveTextContent(
			ABA_MFUND_UI.ALL
		)
		expect(screen.getByRole('button', { name: ABA_MFUND_UI.APPLY })).toBeEnabled()
		expect(filterDispatch).not.toHaveBeenCalled()
	})

	it('Limpiar restores filter defaults and hierarchy Toda (SELECT_ALL)', () => {
		render(<AbaMfundFilterBar onExportExcel={vi.fn()} isExporting={false} />)

		fireEvent.click(screen.getByRole('button', { name: ABA_MFUND_UI.CLEAR }))

		expect(filterDispatch).toHaveBeenCalledWith({
			type: ABA_MFUND_FILTER_ACTION.CLEAR,
		})
		expect(hierarchyDispatch).toHaveBeenCalledWith({ type: 'SELECT_ALL' })
	})

	it('Aplicar commits the draft', () => {
		render(<AbaMfundFilterBar onExportExcel={vi.fn()} isExporting={false} />)

		fireEvent.click(screen.getByRole('button', { name: ABA_MFUND_UI.APPLY }))

		expect(filterDispatch).toHaveBeenCalledWith({
			type: ABA_MFUND_FILTER_ACTION.APPLY,
		})
	})
})
