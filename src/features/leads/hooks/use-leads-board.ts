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
	for (const ownerId of filters.ownerIds ?? []) {
		params.append('owner', String(ownerId))
	}

	return `?${params.toString()}`
}

function filterKey(filters: LeadBoardFilters | undefined): string {
	if (!filters) return ''
	return [
		filters.outcomeStatuses.join(','),
		filters.createdAtRange.gte.toISOString(),
		filters.createdAtRange.lte.toISOString(),
		(filters.ownerIds ?? []).join(','),
	].join('|')
}

/**
 * Fetches the Leads Kanban board. Refetches when `filters` change.
 * Omitting `filters` lets the server apply `getDefaultLeadBoardFilters()`.
 * Freshness is manual (`refetch`, wired to the Actualizar button). The board
 * does not reload on window focus or when GoHighLevel syncs a lead.
 * `paused` holds the request until the hierarchy tree has settled.
 */
export function useLeadsBoard(filters?: LeadBoardFilters, paused = false) {
	const [state, setState] = React.useState<AsyncState<LeadBoardColumn[]>>(
		initialState
	)
	const filtersRef = React.useRef(filters)
	filtersRef.current = filters
	const key = filterKey(filters)

	const fetchBoard = React.useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const response = await fetch(`/api/leads${buildQueryString(filtersRef.current)}`)
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
	}, [key])

	React.useEffect(() => {
		if (paused) return
		void fetchBoard()
	}, [fetchBoard, paused])

	function updateColumns(updater: (columns: LeadBoardColumn[]) => LeadBoardColumn[]) {
		setState((current) => {
			if (current.status !== 'success') return current
			return { status: 'success', data: updater(current.data), error: '' }
		})
	}

	return { state, refetch: fetchBoard, updateColumns }
}
