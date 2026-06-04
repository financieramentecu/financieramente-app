'use client'

import { useState, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { PeriodicityDto } from '@/features/negocios/services/periodicity.service'

/**
 * Hook to fetch all periodicities from GET /api/periodicities.
 * Returns AsyncState<PeriodicityDto[]>.
 */
export function usePeriodicities(): AsyncState<PeriodicityDto[]> {
	const [state, setState] = useState<AsyncState<PeriodicityDto[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		let cancelled = false

		setState({ status: 'loading', data: undefined, error: '' })

		fetch('/api/periodicities')
			.then(async (res) => {
				if (!res.ok) throw new Error('Error al cargar periodicidades')
				const json = await res.json() as { data: PeriodicityDto[] }
				return json.data
			})
			.then((data) => {
				if (!cancelled) {
					setState({ status: 'success', data, error: '' })
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					const msg = err instanceof Error ? err.message : 'Error al cargar periodicidades'
					setState({ status: 'error', data: undefined, error: msg })
				}
			})

		return () => {
			cancelled = true
		}
	}, [])

	return state
}
