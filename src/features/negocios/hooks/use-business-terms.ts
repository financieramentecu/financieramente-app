'use client'

import { useState, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'

/**
 * Hook to fetch distinct business term values from GET /api/negocios/terms.
 * Returns AsyncState<number[]>.
 */
export function useBusinessTerms(): AsyncState<number[]> {
	const [state, setState] = useState<AsyncState<number[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		let cancelled = false

		setState({ status: 'loading', data: undefined, error: '' })

		fetch('/api/negocios/terms')
			.then(async (res) => {
				if (!res.ok) throw new Error('Error al cargar plazos')
				const json = await res.json() as { data: number[] }
				return json.data
			})
			.then((data) => {
				if (!cancelled) {
					setState({ status: 'success', data, error: '' })
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					const msg = err instanceof Error ? err.message : 'Error al cargar plazos'
					setState({ status: 'error', data: undefined, error: msg })
				}
			})

		return () => {
			cancelled = true
		}
	}, [])

	return state
}
