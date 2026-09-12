'use client'

import { useState, useEffect } from 'react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { useAbaMfundFilter } from '../components/aba-mfund-filter-context'
import { fetchAbaMfundKpis } from '../lib/aba-mfund-api'
import { ABA_MFUND_UI } from '../lib/ui-copy'
import type { AbaMfundKpis } from '../types/aba-mfund.types'

const ZERO_KPIS: AbaMfundKpis = {
	abaTotal: { sum: 0, count: 0 },
	fondeado: { sum: 0, count: 0 },
	emitido: { sum: 0, count: 0 },
	ticketPromedio: 0,
}

export interface UseAbaMfundKpisResult {
	readonly state: AsyncState<AbaMfundKpis>
}

/**
 * Fetches KPI aggregates for applied filters + hierarchy selection.
 * Empty hierarchy short-circuits to zeros without calling the API.
 */
export function useAbaMfundKpis(): UseAbaMfundKpisResult {
	const { applied } = useAbaMfundFilter()
	const { selectedUserIds } = useHierarchySelection()

	const [state, setState] = useState<AsyncState<AbaMfundKpis>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		if (selectedUserIds.length === 0) {
			setState({
				status: 'success',
				data: ZERO_KPIS,
				error: '',
			})
			return
		}

		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })

		async function load() {
			try {
				const data = await fetchAbaMfundKpis({
					dateFrom: applied.dateFrom,
					dateTo: applied.dateTo,
					statuses: applied.statuses,
					userIds: selectedUserIds,
				})
				if (!cancelled) {
					setState({ status: 'success', data, error: '' })
				}
			} catch (err) {
				if (!cancelled) {
					setState({
						status: 'error',
						data: undefined,
						error:
							err instanceof Error
								? err.message
								: ABA_MFUND_UI.ERROR_KPIS,
					})
				}
			}
		}

		void load()
		return () => {
			cancelled = true
		}
	}, [applied, selectedUserIds])

	return { state }
}
