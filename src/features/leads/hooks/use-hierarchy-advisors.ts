'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { HierarchyAdvisor } from '@/features/leads/types/hierarchy-advisor.types'

const LOADING: AsyncState<HierarchyAdvisor[]> = { status: 'loading', data: undefined, error: '' }

/** Advisors the signed-in user can filter (self and everyone below). */
export function useHierarchyAdvisors() {
	const [state, setState] = useState<AsyncState<HierarchyAdvisor[]>>(LOADING)

	useEffect(() => {
		let cancelled = false
		fetch('/api/crm/advisors')
			.then(async (response) => {
				if (!response.ok) throw new Error('advisors')
				const body = (await response.json()) as ApiResponse<HierarchyAdvisor[]>
				if (!Array.isArray(body.data)) throw new Error('advisors')
				if (!cancelled) setState({ status: 'success', data: body.data, error: '' })
			})
			.catch(() => {
				if (!cancelled) setState({ status: 'error', data: undefined, error: 'No fue posible cargar los asesores.' })
			})
		return () => {
			cancelled = true
		}
	}, [])

	return state
}
