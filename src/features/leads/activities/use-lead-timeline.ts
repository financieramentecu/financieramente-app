'use client'

import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { LeadCrmEventInput } from '@/features/leads/crm/lead-crm-event.schema'
import type { TimelinePageDto } from '@/features/leads/activities/lead-timeline.types'
import { fetchTimelinePage, postLeadActivity } from '@/features/leads/activities/timeline-api'

const IDLE: AsyncState<TimelinePageDto> = { status: 'idle', data: undefined, error: '' }
const LOADING: AsyncState<TimelinePageDto> = { status: 'loading', data: undefined, error: '' }
const LOAD_ERROR = 'No fue posible cargar la timeline. Inténtalo de nuevo.'

export function useLeadTimeline(leadId: number, enabled: boolean) {
	const [state, setState] = React.useState<AsyncState<TimelinePageDto>>(IDLE)
	const [loadingMore, setLoadingMore] = React.useState(false)

	async function reload() {
		setState(LOADING)
		try {
			setState({ status: 'success', data: await fetchTimelinePage(leadId), error: '' })
		} catch {
			setState({ status: 'error', data: undefined, error: LOAD_ERROR })
		}
	}

	React.useEffect(() => {
		if (!enabled) return
		let cancelled = false
		setState(LOADING)
		fetchTimelinePage(leadId)
			.then((data) => !cancelled && setState({ status: 'success', data, error: '' }))
			.catch(() => !cancelled && setState({ status: 'error', data: undefined, error: LOAD_ERROR }))
		return () => {
			cancelled = true
		}
	}, [leadId, enabled])

	async function loadMore() {
		if (state.status !== 'success' || !state.data.nextCursor) return
		setLoadingMore(true)
		try {
			const next = await fetchTimelinePage(leadId, state.data.nextCursor)
			setState({
				status: 'success',
				data: { items: [...state.data.items, ...next.items], nextCursor: next.nextCursor },
				error: '',
			})
		} finally {
			setLoadingMore(false)
		}
	}

	/** Returns false when the activity could not be saved. */
	async function logActivity(input: LeadCrmEventInput): Promise<boolean> {
		try {
			await postLeadActivity(leadId, input)
			await reload()
			return true
		} catch {
			return false
		}
	}

	return { state, loadingMore, loadMore, logActivity }
}
