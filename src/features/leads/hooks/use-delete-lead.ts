import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

const initialState: AsyncState<{ idLead: number }> = {
	status: 'idle',
	data: undefined,
	error: '',
}

/**
 * Admin-only soft delete of a `Lead` via `DELETE /api/leads/[id]`. The
 * server re-evaluates eligibility; this hook only surfaces the resulting
 * `AsyncState` for the caller (typically `LeadDetailSheet`) to react to.
 */
export function useDeleteLead() {
	const [state, setState] = React.useState<AsyncState<{ idLead: number }>>(
		initialState
	)

	const deleteLead = React.useCallback(async (idLead: number) => {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const response = await fetch(`/api/leads/${idLead}`, {
				method: 'DELETE',
			})
			const body: ApiResponse<{ idLead: number }> = await response.json()

			if (!response.ok || 'error' in body) {
				setState({
					status: 'error',
					data: undefined,
					error: 'error' in body ? body.error : 'Error al eliminar el lead',
				})
				return
			}

			setState({ status: 'success', data: body.data, error: '' })
		} catch {
			setState({
				status: 'error',
				data: undefined,
				error: 'Error al eliminar el lead',
			})
		}
	}, [])

	return { state, deleteLead }
}
