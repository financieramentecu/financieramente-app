import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConvertedLeadsChart } from '../components/converted-leads-chart'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { LeadsAnalyticsReport } from '../types/leads-analytics.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'

vi.mock('../components/heatmap-cell-lead-list', () => ({
	HeatmapCellLeadList: ({
		withBusiness,
		outcomeStatus,
	}: {
		withBusiness?: boolean
		outcomeStatus?: string | null
	}) => (
		<div data-testid={`converted-leads-${outcomeStatus ?? 'all'}`}>
			{withBusiness ? 'with-business' : 'no-business'}
		</div>
	),
}))

const SUCCESS: AsyncState<LeadsAnalyticsReport> = {
	status: 'success',
	error: '',
	data: {
		followUpBars: [],
		converted: {
			total: 1,
			slices: [{ outcomeStatus: 'OPEN', label: 'Abierto', count: 1 }],
		},
		heatmap: { columns: [], rows: [], maxCellCount: 0 },
	},
}

describe('ConvertedLeadsChart', () => {
	it('expands an outcome bar into converted leads with business', () => {
		render(<ConvertedLeadsChart state={SUCCESS} />)

		expect(
			screen.queryByTestId('converted-leads-OPEN')
		).not.toBeInTheDocument()

		fireEvent.click(
			screen.getByRole('button', {
				name: `${LEADS_ANALYTICS_UI.EXPAND_CONVERTED}: Abierto`,
			})
		)

		expect(screen.getByTestId('converted-leads-OPEN')).toHaveTextContent(
			'with-business'
		)
	})

	it('expands the total into all converted leads', () => {
		render(<ConvertedLeadsChart state={SUCCESS} />)

		fireEvent.click(
			screen.getByRole('button', {
				name: LEADS_ANALYTICS_UI.EXPAND_CONVERTED,
			})
		)

		expect(screen.getByTestId('converted-leads-all')).toBeInTheDocument()
	})
})
