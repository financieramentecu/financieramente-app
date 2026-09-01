'use client'

import { useState, useEffect } from 'react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { useAbaMfundFilter } from '../components/aba-mfund-filter-context'
import { fetchAbaMfundRanking } from '../lib/aba-mfund-api'
import { ABA_MFUND_UI } from '../lib/ui-copy'
import type { AbaMfundRanking } from '../types/aba-mfund.types'

const EMPTY_RANKING: AbaMfundRanking = { agents: [] }

export interface UseAbaMfundRankingResult {
	readonly state: AsyncState<AbaMfundRanking>
}

/**
 * Fetches Top 6 ABA por Agente for applied filters + hierarchy.
 * Empty hierarchy short-circuits to an empty list without calling the API.
 */
export function useAbaMfundRanking(): UseAbaMfundRankingResult {
	const { applied } = useAbaMfundFilter()
	const { selectedUserIds } = useHierarchySelection()

	const [state, setState] = useState<AsyncState<AbaMfundRanking>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		if (selectedUserIds.length === 0) {
			setState({
				status: 'success',
				data: EMPTY_RANKING,
				error: '',
			})
			return
		}

		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })

		async function load() {
			try {
				const data = await fetchAbaMfundRanking({
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
								: ABA_MFUND_UI.ERROR_RANKING,
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
