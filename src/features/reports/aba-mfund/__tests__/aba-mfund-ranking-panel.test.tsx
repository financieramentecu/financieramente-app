import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { AbaMfundRanking } from '../types/aba-mfund.types'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import { ABA_MFUND_UI } from '../lib/ui-copy'
import type { CellBusinessRowView } from '@/features/production-dashboard/types/heatmap-cell-expansion.types'

vi.mock('@/features/production-dashboard/components/HierarchySelectionContext', () => ({
	useHierarchySelection: vi.fn(),
}))

import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { AbaMfundRankingPanel } from '../components/aba-mfund-ranking-panel'

const mockUseHierarchySelection = vi.mocked(useHierarchySelection)

function makeBusiness(
	overrides: Partial<CellBusinessRowView> = {}
): CellBusinessRowView {
	return {
		idBusiness: overrides.idBusiness ?? 101,
		companyName: overrides.companyName ?? 'SKANDIA',
		productName: overrides.productName ?? 'MFUND',
		contract: overrides.contract ?? 'C-001',
		value: overrides.value ?? 1_000_000,
		currencyName: overrides.currencyName ?? 'COP',
		status: overrides.status ?? BUSINESS_STATUS.EMITIDO,
	}
}

function makeRanking(agents: AbaMfundRanking['agents']): AsyncState<AbaMfundRanking> {
	return { status: 'success', data: { agents }, error: '' }
}

function setupHierarchy(userIds: number[]) {
	mockUseHierarchySelection.mockReturnValue({
		selectedUserIds: userIds,
		nodes: [],
		toggle: vi.fn(),
		dispatch: vi.fn(),
	} as never)
}

describe('AbaMfundRankingPanel expand-row', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		setupHierarchy([1, 2])
	})

	it('renders Top 6 title and expands an agent with HeatmapCellBusinessRow columns', () => {
		const state = makeRanking([
			{
				idUser: 1,
				agentName: 'Ana Gómez',
				totalValue: 2_000_000,
				businessCount: 1,
				businesses: [makeBusiness()],
			},
			{
				idUser: 2,
				agentName: 'Luis Pérez',
				totalValue: 500_000,
				businessCount: 1,
				businesses: [
					makeBusiness({
						idBusiness: 202,
						contract: 'C-002',
						productName: 'MFUND',
					}),
				],
			},
		])

		render(<AbaMfundRankingPanel state={state} />)

		expect(screen.getByText(ABA_MFUND_UI.RANKING_TITLE)).toBeInTheDocument()
		expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
		expect(screen.queryByText('C-001')).not.toBeInTheDocument()

		const expandButton = screen.getByTestId('aba-mfund-ranking-expand-1')
		expect(expandButton).toHaveAttribute('aria-expanded', 'false')
		expect(expandButton).toHaveAttribute(
			'aria-label',
			ABA_MFUND_UI.EXPAND_AGENT
		)
		expect(expandButton.querySelector('svg.lucide-chevron-right')).toBeTruthy()

		fireEvent.click(expandButton)

		expect(expandButton).toHaveAttribute('aria-expanded', 'true')
		expect(expandButton).toHaveAttribute(
			'aria-label',
			ABA_MFUND_UI.COLLAPSE_AGENT
		)
		expect(expandButton.querySelector('svg.lucide-chevron-down')).toBeTruthy()

		expect(screen.getByTestId('aba-mfund-ranking-embed-1')).toBeInTheDocument()
		expect(screen.getByText(ABA_MFUND_UI.COLUMN_PRODUCT)).toBeInTheDocument()
		expect(screen.getByText(ABA_MFUND_UI.COLUMN_CONTRACT)).toBeInTheDocument()
		expect(
			screen.getAllByText(ABA_MFUND_UI.COLUMN_VALUE).length
		).toBeGreaterThanOrEqual(1)
		expect(screen.getByText(ABA_MFUND_UI.COLUMN_STATUS)).toBeInTheDocument()
		expect(screen.getByText('MFUND')).toBeInTheDocument()
		expect(screen.getByText('C-001')).toBeInTheDocument()
		expect(screen.getByText(/\$1\.000\.000 COP/)).toBeInTheDocument()
		expect(screen.getByText('Emitido')).toBeInTheDocument()

		const embed = screen.getByTestId('aba-mfund-ranking-embed-1')
		const embedValueHeader = [...embed.querySelectorAll('th')].find(
			(th) => th.textContent === ABA_MFUND_UI.COLUMN_VALUE
		)
		const embedStatusHeader = [...embed.querySelectorAll('th')].find(
			(th) => th.textContent === ABA_MFUND_UI.COLUMN_STATUS
		)
		expect(embedValueHeader?.className).toContain('text-left')
		expect(embedValueHeader?.className).not.toContain('text-right')
		expect(embedStatusHeader?.className).toContain('text-left')
		expect(embed.querySelector('table')?.className).toContain('table-fixed')
		expect(screen.getByRole('link', { name: 'Ir a negocio' })).toHaveAttribute(
			'href',
			'/dashboard/negocios/101'
		)
	})

	it('keeps multiple agents expanded independently', () => {
		const state = makeRanking([
			{
				idUser: 1,
				agentName: 'Ana Gómez',
				totalValue: 2_000_000,
				businessCount: 1,
				businesses: [makeBusiness()],
			},
			{
				idUser: 2,
				agentName: 'Luis Pérez',
				totalValue: 500_000,
				businessCount: 1,
				businesses: [makeBusiness({ idBusiness: 202, contract: 'C-002' })],
			},
		])

		render(<AbaMfundRankingPanel state={state} />)

		fireEvent.click(screen.getByTestId('aba-mfund-ranking-expand-1'))
		fireEvent.click(screen.getByTestId('aba-mfund-ranking-expand-2'))

		expect(screen.getByTestId('aba-mfund-ranking-embed-1')).toBeInTheDocument()
		expect(screen.getByTestId('aba-mfund-ranking-embed-2')).toBeInTheDocument()
		expect(screen.getByText('C-001')).toBeInTheDocument()
		expect(screen.getByText('C-002')).toBeInTheDocument()
	})
})
