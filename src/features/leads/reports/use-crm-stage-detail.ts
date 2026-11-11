'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { fetchCrmStageDetail } from '@/features/leads/reports/crm-report-api'
import type { CrmReportRange } from '@/features/leads/reports/crm-pipeline-report.types'
import {
	CRM_STAGE_DETAIL_DEFAULT_PAGE_SIZE,
	isCrmStageDetailPageSize,
	type CrmStageDetailPage,
	type CrmStageDetailPageSize,
	type CrmStageDetailView,
} from '@/features/leads/reports/crm-stage-detail.types'

const LOADING: AsyncState<CrmStageDetailPage> = {
	status: 'loading',
	data: undefined,
	error: '',
}
const FALLBACK_ERROR = 'No fue posible cargar el detalle. Inténtalo de nuevo.'

function toErrorMessage(cause: unknown): string {
	return cause instanceof Error && cause.message
		? cause.message
		: FALLBACK_ERROR
}

/** One page of grouped leads. `null` asks the server for its default range. */
export function useCrmStageDetail(range: CrmReportRange | null) {
	const rangeKey = range ? `${range.from}:${range.to}` : 'default'
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState<CrmStageDetailPageSize>(
		CRM_STAGE_DETAIL_DEFAULT_PAGE_SIZE
	)
	const [stage, setStage] = useState<string | null>(null)
	const [view, setView] = useState<CrmStageDetailView>('current')
	const [trackedRange, setTrackedRange] = useState(rangeKey)
	const filterKey = `${stage ?? ''}:${view}`
	const [trackedFilter, setTrackedFilter] = useState(filterKey)
	const sizeKey = String(pageSize)
	const [trackedSize, setTrackedSize] = useState(sizeKey)
	const [state, setState] = useState<AsyncState<CrmStageDetailPage>>(LOADING)

	if (trackedRange !== rangeKey) {
		setTrackedRange(rangeKey)
		setPage(1)
		setStage(null)
		setView('current')
	}
	if (trackedFilter !== filterKey) {
		setTrackedFilter(filterKey)
		setPage(1)
	}
	if (trackedSize !== sizeKey) {
		setTrackedSize(sizeKey)
		setPage(1)
	}
	const filtersMatch =
		trackedRange === rangeKey && trackedFilter === filterKey && trackedSize === sizeKey
	const activePage = filtersMatch ? page : 1
	const activeStage = trackedRange === rangeKey ? stage : null
	const activeView: CrmStageDetailView = trackedRange === rangeKey ? view : 'current'

	useEffect(() => {
		let cancelled = false
		setState(LOADING)
		fetchCrmStageDetail(range, activePage, pageSize, {
			view: activeView,
			stage: activeStage,
		})
			.then((data) => {
				if (!cancelled) setState({ status: 'success', data, error: '' })
			})
			.catch((cause: unknown) => {
				if (!cancelled)
					setState({
						status: 'error',
						data: undefined,
						error: toErrorMessage(cause),
					})
			})
		return () => {
			cancelled = true
		}
	}, [range, rangeKey, activePage, pageSize, activeStage, activeView])

	function selectPageSize(next: number) {
		if (isCrmStageDetailPageSize(next)) setPageSize(next)
	}

	return {
		state,
		page: activePage,
		setPage,
		pageSize,
		setPageSize: selectPageSize,
		stage: activeStage,
		setStage,
		view: activeView,
		setView,
	}
}
