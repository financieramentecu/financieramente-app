'use client'

import { useState, useEffect, useRef } from 'react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { useProduccionRealFilter } from '../components/produccion-real-filter-context'
import { fetchProduccionRealDetail } from '../lib/produccion-real-api'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'
import { CURRENCY_MODE } from '../types/produccion-real.types'
import type { ProduccionRealDetailRow } from '../types/produccion-real.types'

const DETAIL_PAGE_SIZE = 50

export interface ProduccionRealDetailData {
	readonly rows: readonly ProduccionRealDetailRow[]
	readonly nextCursor: string | null
	readonly hasMore: boolean
}

export interface UseProduccionRealDetailResult {
	readonly state: AsyncState<ProduccionRealDetailData>
	readonly loadMore: () => void
	readonly isLoadingMore: boolean
}

/**
 * Cursor-based detail list with infinite scroll append.
 * Empty hierarchy → empty rows without fetch.
 * Caller lifts TRM and passes `trmRate` / loading flag.
 */
export function useProduccionRealDetail(options: {
	readonly trmRate: number | null
	readonly trmLoading: boolean
}): UseProduccionRealDetailResult {
	const { trmRate, trmLoading } = options
	const { applied } = useProduccionRealFilter()
	const { selectedUserIds } = useHierarchySelection()

	const [state, setState] = useState<AsyncState<ProduccionRealDetailData>>({
		status: 'idle',
		data: undefined,
		error: '',
	})
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const requestIdRef = useRef(0)

	const needsTrm = applied.currencyMode === CURRENCY_MODE.ALL_TRM
	const trmReady = !needsTrm || (trmRate != null && trmRate > 0)

	useEffect(() => {
		const requestId = ++requestIdRef.current

		if (selectedUserIds.length === 0) {
			setState({
				status: 'success',
				data: { rows: [], nextCursor: null, hasMore: false },
				error: '',
			})
			setIsLoadingMore(false)
			return
		}

		if (needsTrm && (trmLoading || !trmReady)) {
			setState({ status: 'loading', data: undefined, error: '' })
			return
		}

		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })
		setIsLoadingMore(false)

		async function loadFirstPage() {
			try {
				const page = await fetchProduccionRealDetail({
					dateFrom: applied.dateFrom,
					dateTo: applied.dateTo,
					contributionTypes: applied.contributionTypes,
					companyIds: applied.companyIds,
					currencyMode: applied.currencyMode,
					userIds: selectedUserIds,
					trmRate: needsTrm ? trmRate : null,
					cursor: null,
					limit: DETAIL_PAGE_SIZE,
				})

				if (cancelled || requestId !== requestIdRef.current) return

				setState({
					status: 'success',
					data: {
						rows: page.rows,
						nextCursor: page.nextCursor,
						hasMore: page.hasMore,
					},
					error: '',
				})
			} catch (err) {
				if (cancelled || requestId !== requestIdRef.current) return
				setState({
					status: 'error',
					data: undefined,
					error:
						err instanceof Error
							? err.message
							: PRODUCCION_REAL_UI.ERROR_DETAIL,
				})
			}
		}

		void loadFirstPage()
		return () => {
			cancelled = true
		}
	}, [
		applied,
		selectedUserIds,
		needsTrm,
		trmLoading,
		trmReady,
		trmRate,
	])

	const loadMore = () => {
		if (state.status !== 'success') return
		if (!state.data.hasMore || !state.data.nextCursor) return
		if (isLoadingMore) return
		if (selectedUserIds.length === 0) return
		if (needsTrm && !trmReady) return

		const requestId = requestIdRef.current
		const cursor = state.data.nextCursor
		setIsLoadingMore(true)

		void (async () => {
			try {
				const page = await fetchProduccionRealDetail({
					dateFrom: applied.dateFrom,
					dateTo: applied.dateTo,
					contributionTypes: applied.contributionTypes,
					companyIds: applied.companyIds,
					currencyMode: applied.currencyMode,
					userIds: selectedUserIds,
					trmRate: needsTrm ? trmRate : null,
					cursor,
					limit: DETAIL_PAGE_SIZE,
				})

				if (requestId !== requestIdRef.current) return

				setState((prev) => {
					if (prev.status !== 'success') return prev
					return {
						status: 'success',
						data: {
							rows: [...prev.data.rows, ...page.rows],
							nextCursor: page.nextCursor,
							hasMore: page.hasMore,
						},
						error: '',
					}
				})
			} catch (err) {
				if (requestId !== requestIdRef.current) return
				setState({
					status: 'error',
					data: undefined,
					error:
						err instanceof Error
							? err.message
							: PRODUCCION_REAL_UI.ERROR_DETAIL,
				})
			} finally {
				if (requestId === requestIdRef.current) {
					setIsLoadingMore(false)
				}
			}
		})()
	}

	return { state, loadMore, isLoadingMore }
}
