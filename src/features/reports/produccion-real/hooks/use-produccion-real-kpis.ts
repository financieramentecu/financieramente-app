'use client'

import { useState, useEffect } from 'react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { useProduccionRealFilter } from '../components/produccion-real-filter-context'
import { emptyProduccionRealKpis } from '../lib/empty-kpis'
import { fetchProduccionRealKpis } from '../lib/produccion-real-api'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'
import {
	CURRENCY_MODE,
	type ProduccionRealKpis,
} from '../types/produccion-real.types'

export interface UseProduccionRealKpisResult {
	readonly state: AsyncState<ProduccionRealKpis>
}

/**
 * Fetches KPI aggregates for applied filters + hierarchy selection.
 * Empty hierarchy short-circuits to zeros without calling the API.
 * Caller lifts TRM (`useTrm`) and passes `trmRate` / loading flag.
 */
export function useProduccionRealKpis(options: {
	readonly trmRate: number | null
	readonly trmLoading: boolean
	readonly trmError: string
}): UseProduccionRealKpisResult {
	const { trmRate, trmLoading, trmError } = options
	const { applied } = useProduccionRealFilter()
	const { selectedUserIds } = useHierarchySelection()

	const [state, setState] = useState<AsyncState<ProduccionRealKpis>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const needsTrm = applied.currencyMode === CURRENCY_MODE.ALL_TRM
	const trmReady = !needsTrm || (trmRate != null && trmRate > 0)

	useEffect(() => {
		if (selectedUserIds.length === 0) {
			setState({
				status: 'success',
				data: emptyProduccionRealKpis(applied.currencyMode),
				error: '',
			})
			return
		}

		if (needsTrm && trmLoading) {
			setState({ status: 'loading', data: undefined, error: '' })
			return
		}

		if (needsTrm && !trmReady) {
			setState({
				status: 'error',
				data: undefined,
				error:
					trmError ||
					'No fue posible consultar la TRM automáticamente',
			})
			return
		}

		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })

		async function load() {
			try {
				const data = await fetchProduccionRealKpis({
					dateFrom: applied.dateFrom,
					dateTo: applied.dateTo,
					contributionTypes: applied.contributionTypes,
					companyIds: applied.companyIds,
					currencyMode: applied.currencyMode,
					userIds: selectedUserIds,
					trmRate: needsTrm ? trmRate : null,
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
								: PRODUCCION_REAL_UI.ERROR_KPIS,
					})
				}
			}
		}

		void load()
		return () => {
			cancelled = true
		}
	}, [
		applied,
		selectedUserIds,
		needsTrm,
		trmReady,
		trmLoading,
		trmRate,
		trmError,
	])

	return { state }
}
