'use client'

import { useEffect, useState } from 'react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { useLeadsAnalyticsFilter } from '../components/leads-analytics-filter-context'
import { EMPTY_LEADS_ANALYTICS_REPORT } from '../lib/empty-report'
import { fetchLeadsAnalyticsReport } from '../lib/leads-analytics-api'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { LeadsAnalyticsReport } from '../types/leads-analytics.types'

export interface UseLeadsAnalyticsReportResult {
	readonly state: AsyncState<LeadsAnalyticsReport>
}

/**
 * Fetches the three Leads Analytics charts for applied dates + hierarchy.
 * Empty hierarchy short-circuits without calling the API.
 */
export function useLeadsAnalyticsReport(): UseLeadsAnalyticsReportResult {
	const { applied } = useLeadsAnalyticsFilter()
	const { selectedUserIds } = useHierarchySelection()
	const [state, setState] = useState<AsyncState<LeadsAnalyticsReport>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		if (selectedUserIds.length === 0) {
			setState({
				status: 'success',
				data: EMPTY_LEADS_ANALYTICS_REPORT,
				error: '',
			})
			return
		}

		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })

		async function load() {
			try {
				const data = await fetchLeadsAnalyticsReport(applied, selectedUserIds)
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
								: LEADS_ANALYTICS_UI.ERROR_REPORT,
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
