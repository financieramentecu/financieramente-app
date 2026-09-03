'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { fetchLeadsAnalyticsReport } from '../lib/leads-analytics-api'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type {
	LeadsAnalyticsDateRange,
	LeadsAnalyticsReport,
} from '../types/leads-analytics.types'

export interface UseLeadsAnalyticsReportResult {
	readonly state: AsyncState<LeadsAnalyticsReport>
}

/**
 * Fetches the three Leads Analytics charts for the applied date range.
 */
export function useLeadsAnalyticsReport(
	range: LeadsAnalyticsDateRange,
	enabled: boolean
): UseLeadsAnalyticsReportResult {
	const [state, setState] = useState<AsyncState<LeadsAnalyticsReport>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		if (!enabled) return

		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })

		async function load() {
			try {
				const data = await fetchLeadsAnalyticsReport(range)
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
	}, [enabled, range.dateFrom, range.dateTo])

	return { state }
}
