'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { useAbaMfundFilter } from '../components/aba-mfund-filter-context'
import { exportAbaMfundExcelClient } from '../lib/aba-mfund-api'
import { ABA_MFUND_UI } from '../lib/ui-copy'

/**
 * Downloads ABA-MFUND Excel for applied filters + hierarchy selection.
 * Empty hierarchy is blocked with a toast and never hits the API.
 */
export function useAbaMfundExport() {
	const { applied } = useAbaMfundFilter()
	const { selectedUserIds } = useHierarchySelection()

	const [state, setState] = useState<AsyncState<{ exported: true }>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const exportExcel = async () => {
		if (selectedUserIds.length === 0) {
			toast.warning(ABA_MFUND_UI.EMPTY_HIERARCHY)
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		const result = await exportAbaMfundExcelClient({
			dateFrom: applied.dateFrom,
			dateTo: applied.dateTo,
			statuses: applied.statuses,
			userIds: selectedUserIds,
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

		toast.success(ABA_MFUND_UI.EXCEL_SUCCESS)
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
