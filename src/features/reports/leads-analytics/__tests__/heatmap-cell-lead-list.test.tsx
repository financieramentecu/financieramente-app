import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { HeatmapCellLeadList } from '../components/heatmap-cell-lead-list'
import { CELL_OWNER_SENTINEL } from '../lib/cell-owner-filter'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { CellLeadList } from '../types/heatmap-cell-leads.types'

vi.mock('../hooks/use-heatmap-cell-leads', () => ({
	useHeatmapCellLeads: vi.fn(),
}))

vi.mock('../components/leads-analytics-detail-context', () => ({
	useLeadsAnalyticsDetail: () => ({ openLead: vi.fn() }),
}))

import { useHeatmapCellLeads } from '../hooks/use-heatmap-cell-leads'

const mockUseHeatmapCellLeads = vi.mocked(useHeatmapCellLeads)

function makeLeads(count: number): CellLeadList {
	return {
		total: count,
		isTruncated: false,
		leads: Array.from({ length: count }, (_, index) => ({
			idLead: index + 1,
			leadName: `Lead ${index + 1}`,
			ownerName: 'Ana Pérez',
			outcomeStatus: 'OPEN',
			outcomeLabel: 'Abierto',
			createdAtLabel: '01/08/2026',
			idBusiness: null,
		})),
	}
}

describe('HeatmapCellLeadList', () => {
	it('shows a loading status while fetching', () => {
		mockUseHeatmapCellLeads.mockReturnValue({
			status: 'loading',
			data: undefined,
			error: '',
		})

		render(
			<HeatmapCellLeadList
				idLeadFunnelColumn={1}
				ownerFilter={CELL_OWNER_SENTINEL.ALL}
				columnName="Lead nuevo"
			/>
		)

		expect(screen.getByRole('status')).toHaveTextContent(
			LEADS_ANALYTICS_UI.LOADING
		)
	})

	it('reveals 20 rows at a time', () => {
		mockUseHeatmapCellLeads.mockReturnValue({
			status: 'success',
			data: makeLeads(25),
			error: '',
		} satisfies AsyncState<CellLeadList>)

		render(
			<HeatmapCellLeadList
				idLeadFunnelColumn={1}
				ownerFilter={10}
				columnName="Lead nuevo"
			/>
		)

		expect(screen.getByText('Lead 1')).toBeInTheDocument()
		expect(screen.queryByText('Lead 21')).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: /Ver más/ }))

		expect(screen.getByText('Lead 21')).toBeInTheDocument()
	})

	it('renders a business link when the lead has a related business', () => {
		mockUseHeatmapCellLeads.mockReturnValue({
			status: 'success',
			data: {
				total: 1,
				isTruncated: false,
				leads: [
					{
						idLead: 7,
						leadName: 'Luisa Salazar',
						ownerName: 'Julieta Villa',
						outcomeStatus: 'OPEN',
						outcomeLabel: 'Abierto',
						createdAtLabel: '8/08/2026',
						idBusiness: 99,
					},
				],
			},
			error: '',
		} satisfies AsyncState<CellLeadList>)

		render(
			<HeatmapCellLeadList
				idLeadFunnelColumn={1}
				ownerFilter={CELL_OWNER_SENTINEL.ALL}
				columnName="Contacto 1ra vez"
			/>
		)

		const link = screen.getByRole('link', {
			name: LEADS_ANALYTICS_UI.VIEW_BUSINESS,
		})
		expect(link).toHaveAttribute('href', '/dashboard/negocios/99')
		expect(link).toHaveAttribute('target', '_blank')
		expect(link).toHaveAttribute('rel', 'noopener noreferrer')
	})
})
