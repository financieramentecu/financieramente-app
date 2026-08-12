'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { useProduccionRealFilter } from '../components/produccion-real-filter-context'
import { exportProduccionRealExcel } from '../lib/produccion-real-api'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'
import { CURRENCY_MODE } from '../types/produccion-real.types'

/**
 * Downloads Producción Real Excel for applied filters + hierarchy selection.
 * Caller lifts TRM (`useTrm`) — same contract as KPI/detail hooks.
 */
export function useProduccionRealExport(options: {
	readonly trmRate: number | null
	readonly trmLoading: boolean
	readonly trmError: string
}) {
	const { trmRate, trmLoading, trmError } = options
	const { applied } = useProduccionRealFilter()
	const { selectedUserIds } = useHierarchySelection()

	const [state, setState] = useState<AsyncState<{ exported: true }>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const exportExcel = async () => {
		if (selectedUserIds.length === 0) {
			toast.warning(PRODUCCION_REAL_UI.EMPTY_HIERARCHY)
			return
		}

		const needsTrm = applied.currencyMode === CURRENCY_MODE.ALL_TRM
		if (needsTrm && trmLoading) {
			toast.info(PRODUCCION_REAL_UI.LOADING)
			return
		}
		if (needsTrm && (trmRate == null || trmRate <= 0)) {
			toast.error(
				trmError ||
					'No fue posible consultar la TRM automáticamente'
			)
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		const result = await exportProduccionRealExcel({
			dateFrom: applied.dateFrom,
			dateTo: applied.dateTo,
			contributionTypes: applied.contributionTypes,
			companyIds: applied.companyIds,
			currencyMode: applied.currencyMode,
			userIds: selectedUserIds,
			trmRate: needsTrm ? trmRate : null,
		})

		if (!result.ok) {
			toast.error(result.error)
			setState({
				status: 'error',
				data: undefined,
				error: result.error,
			})
			return
		}

		toast.success(PRODUCCION_REAL_UI.EXCEL_SUCCESS)
		setState({
			status: 'success',
			data: { exported: true },
			error: '',
		})
	}

	return {
		state,
		exportExcel,
		isExporting: state.status === 'loading',
	}
}
