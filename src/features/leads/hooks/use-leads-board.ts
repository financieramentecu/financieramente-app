import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { LeadBoardColumn } from '@/features/leads/types/lead.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { serializeLeadBoardFilters } from '@/features/leads/lib/lead-board-query'
import type { LeadBoardFilters } from '@/features/leads/lib/lead-board-filters'

const initialState: AsyncState<LeadBoardColumn[]> = {
	status: 'idle',
	data: undefined,
	error: '',
}

/**
 * Fetches the Leads Kanban board. Refetches when `filters` change.
 * Omitting `filters` lets the server apply `getDefaultLeadBoardFilters()`.
 * Freshness is manual (`refetch`, wired to the Actualizar button). The board
 * does not reload on window focus or when GoHighLevel syncs a lead.
 * `paused` holds the request until the hierarchy tree has settled.
 */
export function useLeadsBoard(filters?: LeadBoardFilters, paused = false) {
	const [state, setState] =
		React.useState<AsyncState<LeadBoardColumn[]>>(initialState)
	const requestId = React.useRef(0)
	const key = serializeLeadBoardFilters(filters)

	const fetchBoard = React.useCallback(async () => {
		if (paused) return
		const currentRequest = ++requestId.current
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const response = await fetch(`/api/leads${key}`)
			const body: ApiResponse<LeadBoardColumn[]> = await response.json()
			if (currentRequest !== requestId.current) return

			if ('error' in body) {
				setState({ status: 'error', data: undefined, error: body.error })
				return
			}

			setState({ status: 'success', data: body.data, error: '' })
		} catch {
			if (currentRequest !== requestId.current) return
			setState({
				status: 'error',
				data: undefined,
				error: 'Error al cargar el tablero de leads',
			})
		}
	}, [key, paused])

	React.useEffect(() => {
		if (paused) return
		void fetchBoard()
		return () => {
			requestId.current += 1
		}
	}, [fetchBoard, paused])

	function updateColumns(
		updater: (columns: LeadBoardColumn[]) => LeadBoardColumn[]
	) {
		setState((current) => {
			if (current.status !== 'success') return current
			return { status: 'success', data: updater(current.data), error: '' }
		})
	}

	return { state, refetch: fetchBoard, updateColumns }
}
