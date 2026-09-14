import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LeadsHeatmapTable } from '../components/leads-heatmap-table'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { LeadsAnalyticsReport } from '../types/leads-analytics.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'

vi.mock('../components/heatmap-cell-lead-list', () => ({
	HeatmapCellLeadList: ({
		idLeadFunnelColumn,
		ownerFilter,
	}: {
		idLeadFunnelColumn: number
		ownerFilter: number | string
	}) => (
		<div data-testid={`cell-leads-${ownerFilter}-${idLeadFunnelColumn}`}>
			Detail {ownerFilter}:{idLeadFunnelColumn}
		</div>
	),
}))

const SUCCESS: AsyncState<LeadsAnalyticsReport> = {
	status: 'success',
	error: '',
	data: {
		followUpBars: [],
		converted: { total: 0, slices: [] },
		heatmap: {
			maxCellCount: 4,
			columns: [
				{ idLeadFunnelColumn: 1, name: 'Lead nuevo' },
				{ idLeadFunnelColumn: 2, name: 'Contactado' },
			],
			rows: [
				{
					idUser: 10,
					ownerName: 'Ana Pérez',
					cells: [4, 0],
					rowTotal: 4,
				},
			],
		},
	},
}

describe('LeadsHeatmapTable', () => {
	it('expands a Money Strategist row into lead lists for columns with counts', () => {
		render(<LeadsHeatmapTable state={SUCCESS} />)

		expect(screen.queryByTestId('cell-leads-10-1')).not.toBeInTheDocument()

		fireEvent.click(
			screen.getByRole('button', { name: LEADS_ANALYTICS_UI.EXPAND_OWNER })
		)

		expect(screen.getByTestId('cell-leads-10-1')).toBeInTheDocument()
		expect(screen.queryByTestId('cell-leads-10-2')).not.toBeInTheDocument()
	})

	it('shows the empty state when there are no heatmap rows', () => {
		render(
			<LeadsHeatmapTable
				state={{
					status: 'success',
					error: '',
					data: {
						followUpBars: [],
						converted: { total: 0, slices: [] },
						heatmap: { columns: [], rows: [], maxCellCount: 0 },
					},
				}}
			/>
		)

		expect(screen.getByText(LEADS_ANALYTICS_UI.HEATMAP_EMPTY)).toBeInTheDocument()
	})
})
