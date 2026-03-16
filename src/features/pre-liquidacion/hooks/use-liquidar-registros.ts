'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'

interface LiquidarResult {
	liquidated: number
	fileCompleted: boolean
}

interface UseLiquidarRegistrosReturn {
	execute: (
		ids: number[],
		fileId: number
	) => Promise<LiquidarResult | null>
	state: AsyncState<LiquidarResult>
}

/**
 * Mutation hook for the Liquidar bulk action (SYNCHRONIZED → SETTLED).
 */
export function useLiquidarRegistros(): UseLiquidarRegistrosReturn {
	const [state, setState] = useState<AsyncState<LiquidarResult>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const execute = useCallback(
		async (ids: number[], fileId: number): Promise<LiquidarResult | null> => {
			setState({ status: 'loading', data: undefined, error: '' })

			try {
				const response = await fetch('/api/pre-liquidacion/liquidar', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ids, fileId }),
				})

				const parsed = await response.json().catch(() => ({}))
				const data = parsed.data !== undefined ? parsed.data : parsed

				if (!response.ok) {
					const errorMsg =
						typeof parsed.error === 'string' ? parsed.error : 'Error al liquidar'
					setState({ status: 'error', data: undefined, error: errorMsg })
					return null
				}

				const result: LiquidarResult = {
					liquidated: data.liquidated ?? 0,
					fileCompleted: data.fileCompleted ?? false,
				}
				setState({ status: 'success', data: result, error: '' })
				return result
			} catch (err) {
				console.error('Error al liquidar registros:', err)
				setState({
					status: 'error',
					data: undefined,
					error: err instanceof Error ? err.message : 'Error al liquidar',
				})
				return null
			}
		},
		[]
	)

	return {
		execute,
		state,
	}
}
