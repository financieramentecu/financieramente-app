import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProduccionRealFilterBar } from '../produccion-real-filter-bar'
import { CURRENCY_MODE } from '../../types/produccion-real.types'

vi.mock('../produccion-real-filter-context', () => ({
	PRODUCCION_REAL_FILTER_ACTION: {
		CLEAR: 'CLEAR',
		APPLY: 'APPLY',
		SET_DATE_FROM: 'SET_DATE_FROM',
		SET_DATE_TO: 'SET_DATE_TO',
		SET_CONTRIBUTION_TYPES: 'SET_CONTRIBUTION_TYPES',
		SET_COMPANY_IDS: 'SET_COMPANY_IDS',
		SET_CURRENCY_MODE: 'SET_CURRENCY_MODE',
	},
	useProduccionRealFilter: () => ({
		draft: {
			dateFrom: '2026-01-01',
			dateTo: '2026-01-31',
			contributionTypes: [],
			companyIds: [],
			currencyMode: CURRENCY_MODE.ALL_TRM,
		},
		dispatch: vi.fn(),
		isApplyEnabled: true,
		dateRangeError: null,
	}),
}))

vi.mock(
	'@/features/production-dashboard/components/HierarchySelectionContext',
	() => ({
		useHierarchySelection: () => ({ dispatch: vi.fn() }),
	})
)

vi.mock('../../hooks/use-produccion-real-catalogs', () => ({
	useProduccionRealCatalogs: () => ({ status: 'success', data: { companies: [] } }),
}))

vi.mock(
	'@/features/production-dashboard/components/filters/MonthRangePicker',
	() => ({ MonthRangePicker: () => null })
)
vi.mock(
	'@/features/production-dashboard/components/filters/MultiSelectFilter',
	() => ({ MultiSelectFilter: () => null })
)
vi.mock(
	'@/features/production-dashboard/components/filters/SingleSelectFilter',
	() => ({ SingleSelectFilter: () => null })
)

describe('ProduccionRealFilterBar — export visibility', () => {
	it('shows "Descargar Excel" when canExport is true (default)', () => {
		render(<ProduccionRealFilterBar onExportExcel={vi.fn()} isExporting={false} />)
		expect(
			screen.getByRole('button', { name: /descargar excel/i })
		).toBeInTheDocument()
	})

	it('hides "Descargar Excel" when canExport is false (CONSULTOR)', () => {
		render(
			<ProduccionRealFilterBar
				onExportExcel={vi.fn()}
				isExporting={false}
				canExport={false}
			/>
		)
		expect(
			screen.queryByRole('button', { name: /descargar excel/i })
		).not.toBeInTheDocument()
	})
})
