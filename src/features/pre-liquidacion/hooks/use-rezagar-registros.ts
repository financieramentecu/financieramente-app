'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'

interface RezagarResult {
	lagged: number
}

interface UseRezagarRegistrosReturn {
	execute: (ids: number[]) => Promise<RezagarResult | null>
	state: AsyncState<RezagarResult>
}

/**
 * Mutation hook for the Rezagar bulk action (SYNCHRONIZED → LAG).
 */
export function useRezagarRegistros(): UseRezagarRegistrosReturn {
	const [state, setState] = useState<AsyncState<RezagarResult>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const execute = useCallback(async (ids: number[]): Promise<RezagarResult | null> => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await fetch('/api/pre-liquidacion/rezagar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids }),
			})

			const parsed = await response.json().catch(() => ({}))
			const data = parsed.data !== undefined ? parsed.data : parsed

			if (!response.ok) {
				const errorMsg =
					typeof parsed.error === 'string' ? parsed.error : 'Error al rezagar'
				setState({ status: 'error', data: undefined, error: errorMsg })
				return null
			}

			const result: RezagarResult = { lagged: data.lagged ?? 0 }
			setState({ status: 'success', data: result, error: '' })
			return result
		} catch (err) {
			console.error('Error al rezagar registros:', err)
			setState({
				status: 'error',
				data: undefined,
				error: err instanceof Error ? err.message : 'Error al rezagar',
			})
			return null
		}
	}, [])

	return {
		execute,
		state,
	}
}
