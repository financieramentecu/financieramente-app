import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CrmSummaryCards } from '../crm-summary-cards'
import { getDefaultLeadBoardFilters } from '@/features/leads/lib/lead-board-filters'
const summary = {
	opportunities: 9,
	associatedOpportunities: 4,
	stageCounts: [],
	openTasks: 3,
	overdueTasks: 1,
	openCases: 2,
	overdueCases: 0,
}
function mockSummary() {
	const fetch = vi
		.fn()
		.mockResolvedValue({ ok: true, json: async () => ({ data: summary }) })
	vi.stubGlobal('fetch', fetch)
	return fetch
}
describe('CrmSummaryCards', () => {
	afterEach(() => vi.unstubAllGlobals())
	it.each([
		{ enabled: false, paused: false },
		{ enabled: true, paused: true },
	])('does not fetch or show stale scope when disabled/paused %j', (props) => {
		const fetch = mockSummary()
		const { container } = render(<CrmSummaryCards {...props} />)
		expect(container).toBeEmptyDOMElement()
		expect(fetch).not.toHaveBeenCalled()
	})
	it('renders aggregate-only metrics and the associated count', async () => {
		mockSummary()
		render(<CrmSummaryCards enabled />)
		expect(await screen.findByText('Oportunidades activas')).toBeInTheDocument()
		expect(screen.getByText('9')).toBeInTheDocument()
		expect(screen.getByText('4')).toBeInTheDocument()
		expect(screen.getByText('1 vencidas')).toBeInTheDocument()
		expect(screen.queryByText(/correo|teléfono/i)).not.toBeInTheDocument()
	})
	it('toggles associated filter without narrowing or refetching base metrics', async () => {
		const fetch = mockSummary()
		const onChange = vi.fn()
		const filters = {
			...getDefaultLeadBoardFilters(),
			excludedOwnerIds: [8],
			originIds: [3],
		}
		const { rerender } = render(
			<CrmSummaryCards
				enabled
				filters={filters}
				onAssociatedOnlyChange={onChange}
			/>
		)
		const button = await screen.findByRole('button', {
			name: 'Oportunidades asociadas',
		})
		expect(button).toHaveAttribute('aria-pressed', 'false')
		await userEvent.click(button)
		expect(onChange).toHaveBeenLastCalledWith(true)
		rerender(
			<CrmSummaryCards
				enabled
				filters={{ ...filters, associatedOnly: true }}
				onAssociatedOnlyChange={onChange}
			/>
		)
		expect(
			screen.getByRole('button', { name: 'Oportunidades asociadas' })
		).toHaveAttribute('aria-pressed', 'true')
		expect(screen.getByText('9')).toBeInTheDocument()
		expect(screen.getByText('4')).toBeInTheDocument()
		expect(fetch).toHaveBeenCalledTimes(1)
		const url = new URL(fetch.mock.calls[0][0], 'http://localhost')
		expect(url.searchParams.get('exclude')).toBe('8')
		expect(url.searchParams.get('origin')).toBe('3')
		expect(url.searchParams.has('associatedOnly')).toBe(false)
		await userEvent.click(
			screen.getByRole('button', { name: 'Oportunidades asociadas' })
		)
		expect(onChange).toHaveBeenLastCalledWith(false)
	})
	it('refreshes on branch/filter changes and explicit pipeline refresh', async () => {
		const fetch = mockSummary()
		const filters = getDefaultLeadBoardFilters()
		const { rerender } = render(
			<CrmSummaryCards enabled filters={filters} refreshKey={0} />
		)
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
		rerender(
			<CrmSummaryCards
				enabled
				filters={{ ...filters, excludedOwnerIds: [8] }}
				refreshKey={0}
			/>
		)
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
		rerender(
			<CrmSummaryCards
				enabled
				filters={{ ...filters, excludedOwnerIds: [8] }}
				refreshKey={1}
			/>
		)
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
	})
})
