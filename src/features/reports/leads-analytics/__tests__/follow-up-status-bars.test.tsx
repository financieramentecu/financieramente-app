import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FollowUpStatusBars } from '../components/follow-up-status-bars'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { LeadsAnalyticsReport } from '../types/leads-analytics.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'

vi.mock('../components/heatmap-cell-lead-list', () => ({
	HeatmapCellLeadList: ({
		idLeadFunnelColumn,
	}: {
		idLeadFunnelColumn: number
	}) => <div data-testid={`bar-leads-${idLeadFunnelColumn}`}>Leads</div>,
}))

const SUCCESS: AsyncState<LeadsAnalyticsReport> = {
	status: 'success',
	error: '',
	data: {
		followUpBars: [
			{
				idLeadFunnelColumn: 1,
				name: 'Lead nuevo',
				position: 0,
				count: 4,
			},
		],
		converted: { total: 0, slices: [] },
		heatmap: { columns: [], rows: [], maxCellCount: 0 },
	},
}

describe('FollowUpStatusBars', () => {
	it('expands a funnel bar into the lead list for that column', () => {
		render(<FollowUpStatusBars state={SUCCESS} />)

		expect(screen.queryByTestId('bar-leads-1')).not.toBeInTheDocument()

		fireEvent.click(
			screen.getByRole('button', { name: LEADS_ANALYTICS_UI.EXPAND_FUNNEL })
		)

		expect(screen.getByTestId('bar-leads-1')).toBeInTheDocument()
	})
})
