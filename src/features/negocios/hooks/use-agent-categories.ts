'use client'

import { useState, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'

export interface AgentCategoryDto {
	id: number
	name: string
}

/**
 * Hook to fetch all active agent categories from GET /api/categories?status=active.
 * Used to populate the Money Strategist category multiselect in AdvancedFiltersSheet.
 */
export function useAgentCategories(): AsyncState<AgentCategoryDto[]> {
	const [state, setState] = useState<AsyncState<AgentCategoryDto[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		let cancelled = false

		setState({ status: 'loading', data: undefined, error: '' })

		fetch('/api/categories?status=active&beneficiaryMode=OVERRIDE&pageSize=100')
			.then(async (res) => {
				if (!res.ok) throw new Error('Error al cargar categorías')
				const json = await res.json() as { data: { categories: { id: number; name: string }[] } }
				return json.data.categories.map((c) => ({ id: c.id, name: c.name }))
			})
			.then((data) => {
				if (!cancelled) {
					setState({ status: 'success', data, error: '' })
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					const msg = err instanceof Error ? err.message : 'Error al cargar categorías'
					setState({ status: 'error', data: undefined, error: msg })
				}
			})

		return () => { cancelled = true }
	}, [])

	return state
}
