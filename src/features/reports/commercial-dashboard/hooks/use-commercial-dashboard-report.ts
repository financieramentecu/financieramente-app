'use client'

import { useEffect, useState } from 'react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { useLeadsAnalyticsFilter } from '@/features/reports/leads-analytics/components/leads-analytics-filter-context'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { fetchCommercialDashboardReport } from '../lib/commercial-dashboard-api'
import { EMPTY_COMMERCIAL_DASHBOARD_REPORT } from '../lib/empty-report'
import { COMMERCIAL_DASHBOARD_UI } from '../lib/ui-copy'
import type { CommercialDashboardReport } from '../types/commercial-dashboard.types'

export interface UseCommercialDashboardReportResult {
	readonly state: AsyncState<CommercialDashboardReport>
}

/**
 * Fetches the commercial report for the applied date range + hierarchy.
 * Empty hierarchy short-circuits without calling the API.
 */
export function useCommercialDashboardReport(
	pipelines: readonly string[] = []
): UseCommercialDashboardReportResult {
	const { applied } = useLeadsAnalyticsFilter()
	const { selectedUserIds } = useHierarchySelection()
	const [state, setState] = useState<AsyncState<CommercialDashboardReport>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	// Stable dependency: the caller may pass a new array each render.
	const pipelineKey = JSON.stringify(pipelines)

	useEffect(() => {
		if (selectedUserIds.length === 0) {
			setState({
				status: 'success',
				data: EMPTY_COMMERCIAL_DASHBOARD_REPORT,
				error: '',
			})
			return
		}

		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })

		async function load() {
			try {
				const data = await fetchCommercialDashboardReport(
					applied,
					selectedUserIds,
					JSON.parse(pipelineKey) as string[]
				)
				if (!cancelled) setState({ status: 'success', data, error: '' })
			} catch (err) {
				if (!cancelled) {
					setState({
						status: 'error',
						data: undefined,
						error:
							err instanceof Error
								? err.message
								: COMMERCIAL_DASHBOARD_UI.ERROR_REPORT,
					})
				}
			}
		}

		void load()
		return () => {
			cancelled = true
		}
	}, [applied, selectedUserIds, pipelineKey])

	return { state }
}
