'use client'

import { useState, useEffect, useRef } from 'react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { useAbaMfundFilter } from '../components/aba-mfund-filter-context'
import { fetchAbaMfundDetail } from '../lib/aba-mfund-api'
import { ABA_MFUND_UI } from '../lib/ui-copy'
import type { AbaMfundDetailData } from '../types/aba-mfund.types'

const DETAIL_PAGE_SIZE = 50

export type { AbaMfundDetailData }

export interface UseAbaMfundDetailResult {
	readonly state: AsyncState<AbaMfundDetailData>
	readonly loadMore: () => void
	readonly isLoadingMore: boolean
}

/**
 * Cursor-based detail list with infinite scroll append.
 * Empty hierarchy → empty rows without fetch.
 */
export function useAbaMfundDetail(): UseAbaMfundDetailResult {
	const { applied } = useAbaMfundFilter()
	const { selectedUserIds } = useHierarchySelection()

	const [state, setState] = useState<AsyncState<AbaMfundDetailData>>({
		status: 'idle',
		data: undefined,
		error: '',
	})
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const requestIdRef = useRef(0)

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

		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })
		setIsLoadingMore(false)

		async function loadFirstPage() {
			try {
				const page = await fetchAbaMfundDetail({
					dateFrom: applied.dateFrom,
					dateTo: applied.dateTo,
					statuses: applied.statuses,
					userIds: selectedUserIds,
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
							: ABA_MFUND_UI.ERROR_DETAIL,
				})
			}
		}

		void loadFirstPage()
		return () => {
			cancelled = true
		}
	}, [applied, selectedUserIds])

	const loadMore = () => {
		if (state.status !== 'success') return
		if (!state.data.hasMore || !state.data.nextCursor) return
		if (isLoadingMore) return
		if (selectedUserIds.length === 0) return

		const requestId = requestIdRef.current
		const cursor = state.data.nextCursor
		setIsLoadingMore(true)

		void (async () => {
			try {
				const page = await fetchAbaMfundDetail({
					dateFrom: applied.dateFrom,
					dateTo: applied.dateTo,
					statuses: applied.statuses,
					userIds: selectedUserIds,
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
							: ABA_MFUND_UI.ERROR_DETAIL,
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
