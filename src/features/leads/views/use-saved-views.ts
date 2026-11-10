'use client'

import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { LeadSavedView, SavedLeadTableQuery } from '@/features/leads/views/lead-saved-view.types'
import { createSavedView, deleteSavedView, fetchSavedViews } from '@/features/leads/views/saved-views-api'

export function useSavedViews() {
	const [state, setState] = React.useState<AsyncState<LeadSavedView[]>>({ status: 'loading', data: undefined, error: '' })
	const [actionError, setActionError] = React.useState<string | null>(null)

	async function reload() {
		try {
			setState({ status: 'success', data: await fetchSavedViews(), error: '' })
		} catch (cause) {
			setState({ status: 'error', data: undefined, error: (cause as Error).message })
		}
	}

	React.useEffect(() => {
		let cancelled = false
		fetchSavedViews()
			.then((data) => !cancelled && setState({ status: 'success', data, error: '' }))
			.catch((cause: Error) => !cancelled && setState({ status: 'error', data: undefined, error: cause.message }))
		return () => {
			cancelled = true
		}
	}, [])

	async function save(name: string, query: SavedLeadTableQuery): Promise<LeadSavedView | null> {
		setActionError(null)
		try {
			const view = await createSavedView(name, query)
			await reload()
			return view
		} catch (cause) {
			setActionError((cause as Error).message)
			return null
		}
	}

	async function remove(idLeadSavedView: number): Promise<boolean> {
		setActionError(null)
		try {
			await deleteSavedView(idLeadSavedView)
			await reload()
			return true
		} catch (cause) {
			setActionError((cause as Error).message)
			return false
		}
	}

	return { state, actionError, save, remove }
}
