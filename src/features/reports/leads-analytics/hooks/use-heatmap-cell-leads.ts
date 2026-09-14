'use client'

import { useEffect, useState } from 'react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { useLeadsAnalyticsFilter } from '../components/leads-analytics-filter-context'
import type { CellOwnerFilter } from '../lib/cell-owner-filter'
import { fetchHeatmapCellLeads } from '../lib/leads-analytics-api'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { CellLeadList } from '../types/heatmap-cell-leads.types'

export interface UseHeatmapCellLeadsArgs {
	readonly idLeadFunnelColumn: number
	readonly ownerFilter: CellOwnerFilter
	readonly enabled: boolean
}

/**
 * Lazy-loads lead rows for one funnel column when a heatmap/bar is expanded.
 */
export function useHeatmapCellLeads({
	idLeadFunnelColumn,
	ownerFilter,
	enabled,
}: UseHeatmapCellLeadsArgs): AsyncState<CellLeadList> {
	const { applied } = useLeadsAnalyticsFilter()
	const { selectedUserIds } = useHierarchySelection()
	const [state, setState] = useState<AsyncState<CellLeadList>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		if (!enabled) return

		if (selectedUserIds.length === 0) {
			setState({
				status: 'success',
				data: { leads: [], total: 0, isTruncated: false },
				error: '',
			})
			return
		}

		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })

		async function load() {
			try {
				const data = await fetchHeatmapCellLeads({
					dateFrom: applied.dateFrom,
					dateTo: applied.dateTo,
					userIds: selectedUserIds,
					idLeadFunnelColumn,
					ownerFilter,
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
								: LEADS_ANALYTICS_UI.ERROR_CELL_LEADS,
					})
				}
			}
		}

		void load()
		return () => {
			cancelled = true
		}
	}, [applied, enabled, idLeadFunnelColumn, ownerFilter, selectedUserIds])

	return state
}
