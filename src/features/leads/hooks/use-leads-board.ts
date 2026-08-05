import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { LeadBoardColumn } from '@/features/leads/types/lead.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadBoardFilters } from '@/features/leads/lib/lead-board-filters'

const initialState: AsyncState<LeadBoardColumn[]> = {
	status: 'idle',
	data: undefined,
	error: '',
}

function buildQueryString(filters: LeadBoardFilters | undefined): string {
	if (!filters) return ''

	const params = new URLSearchParams()
	for (const status of filters.outcomeStatuses) {
		params.append('outcomeStatus', status)
	}
	params.set('createdFrom', filters.createdAtRange.gte.toISOString().slice(0, 10))
	params.set('createdTo', filters.createdAtRange.lte.toISOString().slice(0, 10))

	return `?${params.toString()}`
}

/**
 * Fetches the read-only Leads Kanban board. Refetches whenever `filters`
 * changes (outcome-status chips / createdAt range) — omitting `filters`
 * lets the server apply `getDefaultLeadBoardFilters()`. There is no
 * real-time push for new leads (webhook-driven, no WebSocket/SSE in this
 * feature), so freshness is manual (`refetch`, wired to a button by the
 * caller) plus an automatic refetch when the tab regains focus/visibility
 * — cheap, no server load while the tab is backgrounded, unlike interval
 * polling.
 */
export function useLeadsBoard(filters?: LeadBoardFilters) {
	const [state, setState] = React.useState<AsyncState<LeadBoardColumn[]>>(
		initialState
	)

	const fetchBoard = React.useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const response = await fetch(`/api/leads${buildQueryString(filters)}`)
			const body: ApiResponse<LeadBoardColumn[]> = await response.json()

			if ('error' in body) {
				setState({ status: 'error', data: undefined, error: body.error })
				return
			}

			setState({ status: 'success', data: body.data, error: '' })
		} catch {
			setState({
				status: 'error',
				data: undefined,
				error: 'Error al cargar el tablero de leads',
			})
		}
	}, [filters])

	React.useEffect(() => {
		fetchBoard()
	}, [fetchBoard])

	React.useEffect(() => {
		const handleFocusRefetch = () => {
			if (document.visibilityState === 'visible') {
				fetchBoard()
			}
		}

		window.addEventListener('focus', handleFocusRefetch)
		document.addEventListener('visibilitychange', handleFocusRefetch)

		return () => {
			window.removeEventListener('focus', handleFocusRefetch)
			document.removeEventListener('visibilitychange', handleFocusRefetch)
		}
	}, [fetchBoard])

	return { state, refetch: fetchBoard }
}
