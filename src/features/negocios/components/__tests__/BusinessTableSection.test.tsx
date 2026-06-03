import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BusinessTableSection } from '../BusinessTableSection'

// Mock heavy dependencies
vi.mock('@/features/shared/ui/DataTable/DataTable', () => ({
	DataTable: ({
		searchable,
		loading,
		renderAdditionalFilters,
		toolbarTrailingActions,
	}: {
		searchable?: boolean
		loading?: boolean
		renderAdditionalFilters?: (() => React.ReactNode) | null
		toolbarTrailingActions?: (() => React.ReactNode) | null
	}) => (
		<div data-testid="data-table">
			{searchable && <input placeholder="search" />}
			{loading && <div data-testid="loading" />}
			{renderAdditionalFilters ? renderAdditionalFilters() : null}
			{toolbarTrailingActions ? toolbarTrailingActions() : null}
		</div>
	),
}))

vi.mock('@/features/shared/ui/DataTable/DataTableColumnHeader', () => ({
	DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>,
}))

vi.mock('../AdvancedFiltersSheet', () => ({
	AdvancedFiltersSheet: () => (
		<button data-testid="advanced-filters-sheet">Filtros avanzados</button>
	),
}))

vi.mock('@/features/negocios/components/modals/AdvancedFiltersModal', () => ({
	AdvancedFiltersModal: () => null,
}))

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/features/shared/lib/format-date', () => ({
	formatDateBogota: (d: string) => d ?? '',
}))

// Minimal business mock
const mockBusiness = {
	id: 1,
	clientName: 'Test Client',
	identification: '12345',
	contract: 'C001',
	statusCode: 'EMITIDO',
	status: 'Emitido',
	agentName: 'Agent',
	agentCategory: 'Cat',
	companyName: 'Company',
	product: 'Product',
	clientOriginName: 'Origin',
	term: 12,
	periodicityName: 'Anual',
	value: 1000,
	currency: 'COP',
	dateIssued: null,
	dateAnchored: null,
	date: '2026-01-01',
	hasPayments: false,
	supportCount: 0,
	agentAvatarUrl: null,
}

describe('BusinessTableSection — new toolbar', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders the AdvancedFiltersSheet trigger', () => {
		render(
			<BusinessTableSection
				data={[]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
			/>
		)
		expect(screen.getByTestId('advanced-filters-sheet')).toBeInTheDocument()
	})

	it('shows Export button when canExportExcel is true', () => {
		render(
			<BusinessTableSection
				data={[]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
				canExportExcel={true}
				onExportExcel={vi.fn()}
				isExportingExcel={false}
			/>
		)
		expect(screen.getByText(/Exportar Excel/i)).toBeInTheDocument()
	})

	it('Export button is disabled during loading', () => {
		render(
			<BusinessTableSection
				data={[]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
				canExportExcel={true}
				onExportExcel={vi.fn()}
				isExportingExcel={true}
			/>
		)
		const exportBtn = screen.getByText(/Exportando/i).closest('button')
		expect(exportBtn).toBeDisabled()
	})

	it('does not show Export button when canExportExcel is false', () => {
		render(
			<BusinessTableSection
				data={[]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
				canExportExcel={false}
			/>
		)
		expect(screen.queryByText(/Exportar Excel/i)).not.toBeInTheDocument()
	})
})
