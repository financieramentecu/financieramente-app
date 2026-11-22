'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { HierarchyAdvisor } from '@/features/leads/types/hierarchy-advisor.types'

const LOADING: AsyncState<HierarchyAdvisor[]> = { status: 'loading', data: undefined, error: '' }

export interface HierarchyAdvisorAccess {
	state: AsyncState<HierarchyAdvisor[]>
	/** Admin or a leader of other Money Strategies. */
	canLead: boolean
}

/** Advisors the signed-in user can filter, plus whether they may assign one. */
export function useHierarchyAdvisors(): HierarchyAdvisorAccess {
	const [state, setState] = useState<AsyncState<HierarchyAdvisor[]>>(LOADING)
	const [canLead, setCanLead] = useState(false)

	useEffect(() => {
		let cancelled = false
		fetch('/api/crm/advisors')
			.then(async (response) => {
				if (!response.ok) throw new Error('advisors')
				const body = (await response.json()) as ApiResponse<HierarchyAdvisor[]> & {
					canLeadMoneyStrategies?: boolean
				}
				if (!Array.isArray(body.data)) throw new Error('advisors')
				if (!cancelled) {
					setCanLead(body.canLeadMoneyStrategies === true)
					setState({ status: 'success', data: body.data, error: '' })
				}
			})
			.catch(() => {
				if (!cancelled) {
					setCanLead(false)
					setState({ status: 'error', data: undefined, error: 'No fue posible cargar los asesores.' })
				}
			})
		return () => {
			cancelled = true
		}
	}, [])

	return { state, canLead }
}
