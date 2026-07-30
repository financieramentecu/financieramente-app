import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { AsyncState } from '@/features/shared/types/async-state.types'

vi.mock('@/features/production-dashboard/hooks/use-cell-businesses', () => ({
	useCellBusinesses: vi.fn(),
}))

// Imports AFTER vi.mock declarations (hoisted by Vitest)
import { useCellBusinesses } from '@/features/production-dashboard/hooks/use-cell-businesses'
import { HeatmapCellBusinessList } from '@/features/production-dashboard/components/HeatmapCellBusinessList'
import type { CellBusinessList, CellBusinessRowView } from '@/features/production-dashboard/types/heatmap-cell-expansion.types'
import type { DashboardAppliedFilters } from '@/features/production-dashboard/types/dashboard-filter.types'

const mockUseCellBusinesses = vi.mocked(useCellBusinesses)

const baseFilters: DashboardAppliedFilters = {
	dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
	statuses: [],
	categoryIds: [],
	companyIds: [],
	productIds: [],
	originIds: [],
	plazos: [],
	periodicidades: [],
	isInternacional: false,
}

function makeRows(count: number): CellBusinessRowView[] {
	return Array.from({ length: count }, (_, i) => ({
		idBusiness: i + 1,
		companyName: 'Empresa X',
		productName: `Producto ${i + 1}`,
		contract: `C-${i + 1}`,
		value: 1000,
		currencyName: 'USD',
		status: 'EMITIDO',
	}))
}

function baseProps() {
	return {
		idUser: 7,
		idCompany: 5,
		appliedFilters: baseFilters,
		periodicityIdByName: new Map<string, number>(),
	}
}

describe('HeatmapCellBusinessList', () => {
	it('(a) shows a loading indicator while fetching', () => {
		mockUseCellBusinesses.mockReturnValue({ status: 'loading', data: undefined, error: '' })

		render(<HeatmapCellBusinessList {...baseProps()} />)

		expect(screen.getByRole('status')).toBeInTheDocument()
	})

	it('(b) shows an empty-state message on a zero-result success', () => {
		mockUseCellBusinesses.mockReturnValue({
			status: 'success',
			data: { businesses: [], total: 0, isTruncated: false },
			error: '',
		} satisfies AsyncState<CellBusinessList>)

		render(<HeatmapCellBusinessList {...baseProps()} />)

		expect(screen.getByText(/sin negocios/i)).toBeInTheDocument()
	})

	it('(c) shows an error state distinct from empty', () => {
		mockUseCellBusinesses.mockReturnValue({
			status: 'error',
			data: undefined,
			error: 'Error al obtener negocios',
		})

		render(<HeatmapCellBusinessList {...baseProps()} />)

		expect(screen.getByRole('alert')).toHaveTextContent('Error al obtener negocios')
		expect(screen.queryByText(/sin negocios/i)).not.toBeInTheDocument()
	})

	it('(d) shows only the first 20 rows, revealing 20 more per "Ver más" click', () => {
		mockUseCellBusinesses.mockReturnValue({
			status: 'success',
			data: { businesses: makeRows(45), total: 45, isTruncated: false },
			error: '',
		} satisfies AsyncState<CellBusinessList>)

		render(<HeatmapCellBusinessList {...baseProps()} />)

		expect(screen.getAllByText(/Producto \d+/)).toHaveLength(20)
		fireEvent.click(screen.getByRole('button', { name: /ver más/i }))
		expect(screen.getAllByText(/Producto \d+/)).toHaveLength(40)
		fireEvent.click(screen.getByRole('button', { name: /ver más/i }))
		expect(screen.getAllByText(/Producto \d+/)).toHaveLength(45)
		expect(screen.queryByRole('button', { name: /ver más/i })).not.toBeInTheDocument()
	})

	it('(e) no "Ver más" button when 20 or fewer rows', () => {
		mockUseCellBusinesses.mockReturnValue({
			status: 'success',
			data: { businesses: makeRows(5), total: 5, isTruncated: false },
			error: '',
		} satisfies AsyncState<CellBusinessList>)

		render(<HeatmapCellBusinessList {...baseProps()} />)

		expect(screen.queryByRole('button', { name: /ver más/i })).not.toBeInTheDocument()
	})

	it('(f) renders no max-h/overflow-y wrapper anywhere (no internal scroll container)', () => {
		mockUseCellBusinesses.mockReturnValue({
			status: 'success',
			data: { businesses: makeRows(45), total: 45, isTruncated: false },
			error: '',
		} satisfies AsyncState<CellBusinessList>)

		const { container } = render(<HeatmapCellBusinessList {...baseProps()} />)

		const html = container.innerHTML
		expect(html).not.toMatch(/max-h-/)
		expect(html).not.toMatch(/overflow-y/)
	})

	it('(g) shows a truncation notice when isTruncated is true', () => {
		mockUseCellBusinesses.mockReturnValue({
			status: 'success',
			data: { businesses: makeRows(3), total: 800, isTruncated: true },
			error: '',
		} satisfies AsyncState<CellBusinessList>)

		render(<HeatmapCellBusinessList {...baseProps()} />)

		expect(screen.getByText(/800/)).toBeInTheDocument()
	})
})
