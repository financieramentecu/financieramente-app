import { beforeEach, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadsBoard } from '../leads-board'
import type { LeadBoardFilters } from '@/features/leads/lib/lead-board-filters'
const state = vi.hoisted(() => ({
	hierarchy: {
		ready: true,
		noneSelected: false,
		ownerIds: [],
		excludedOwnerIds: [8],
	},
	summary: {} as {
		filters: LeadBoardFilters
		refreshKey: number
		paused: boolean
		onAssociatedOnlyChange: (value: boolean) => void
	},
	ownerAssigned: (() => {}) as (owner: {
		idUser: number
		ownerName: string
		assignedLeadIds: number[]
	}) => void,
}))
vi.mock('@/features/shared/hooks/use-feature-flag', () => ({
	useFeatureFlag: () => ({ enabled: true }),
}))
vi.mock('@/features/leads/components/crm-hierarchy-shell', () => ({
	useCrmHierarchyFilter: () => state.hierarchy,
	CRM_HIERARCHY_EMPTY_MESSAGE: 'Empty',
}))
vi.mock('@/features/leads/analytics/crm-summary-cards', () => ({
	CrmSummaryCards: (props: typeof state.summary) => {
		state.summary = props
		return (
			<button
				onClick={() =>
					props.onAssociatedOnlyChange(!props.filters.associatedOnly)
				}
			>
				Associated fixture
			</button>
		)
	},
}))
vi.mock('@/features/leads/components/create-lead-dialog', () => ({
	CreateLeadDialog: ({ onCreated }: { onCreated: () => void }) => (
		<button onClick={onCreated}>Create fixture</button>
	),
}))
vi.mock('@/features/leads/components/crm-lead-detail-sheet', () => ({
	CrmLeadDetailSheet: ({
		onOwnerAssigned,
	}: {
		onOwnerAssigned: typeof state.ownerAssigned
	}) => {
		state.ownerAssigned = onOwnerAssigned
		return null
	},
}))
vi.mock('@/features/leads/components/leads-board-filters', () => ({
	LeadsBoardFilters: () => null,
}))
const fetch = vi.fn()
function boardFetches() {
	return fetch.mock.calls.filter((call) =>
		String(call[0]).startsWith('/api/leads')
	)
}
beforeEach(() => {
	fetch
		.mockReset()
		.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
	vi.stubGlobal('fetch', fetch)
	state.hierarchy = {
		ready: true,
		noneSelected: false,
		ownerIds: [],
		excludedOwnerIds: [8],
	}
})
it('wires card toggle and refreshes summary after manual refresh and native creation', async () => {
	render(<LeadsBoard />)
	const user = userEvent.setup()
	await waitFor(() => expect(boardFetches()).toHaveLength(1))
	expect(
		new URL(boardFetches()[0][0], 'http://localhost').searchParams.get(
			'exclude'
		)
	).toBe('8')
	expect(state.summary.filters.excludedOwnerIds).toEqual([8])
	await user.click(screen.getByRole('button', { name: 'Associated fixture' }))
	await waitFor(() => expect(boardFetches()).toHaveLength(2))
	expect(
		new URL(boardFetches()[1][0], 'http://localhost').searchParams.get(
			'associatedOnly'
		)
	).toBe('true')
	expect(state.summary.refreshKey).toBe(0)
	await user.click(screen.getByRole('button', { name: 'Associated fixture' }))
	await waitFor(() => expect(boardFetches()).toHaveLength(3))
	expect(
		new URL(boardFetches()[2][0], 'http://localhost').searchParams.has(
			'associatedOnly'
		)
	).toBe(false)
	await user.click(screen.getByRole('button', { name: /actualizar/i }))
	await waitFor(() => expect(boardFetches()).toHaveLength(4))
	expect(state.summary.refreshKey).toBe(1)
	await user.click(screen.getByRole('button', { name: 'Create fixture' }))
	await waitFor(() => expect(boardFetches()).toHaveLength(5))
	expect(state.summary.refreshKey).toBe(2)
})
it('refreshes board and grouped counters after an owner changes', async () => {
	render(<LeadsBoard />)
	await waitFor(() => expect(boardFetches()).toHaveLength(1))
	await act(async () => {
		state.ownerAssigned({
			idUser: 8,
			ownerName: 'Advisor',
			assignedLeadIds: [4],
		})
	})
	await waitFor(() => expect(boardFetches()).toHaveLength(2))
	expect(state.summary.refreshKey).toBe(1)
})
it.each([
	{ ready: false, noneSelected: false },
	{ ready: true, noneSelected: true },
])(
	'pauses both board and summary for unavailable hierarchy %j',
	async (scope) => {
		state.hierarchy = { ...state.hierarchy, ...scope }
		await act(async () => {
			render(<LeadsBoard />)
		})
		expect(state.summary.paused).toBe(true)
		expect(boardFetches()).toHaveLength(0)
		expect(screen.getByRole('button', { name: /actualizar/i })).toBeDisabled()
	}
)
