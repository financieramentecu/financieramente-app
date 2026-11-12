'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { columnTitle } from '@/features/leads/agenda/activity-bucket'
import { fetchActivityColumns, renameActivityColumn } from '@/features/leads/agenda/activity-columns-api'
import type { ActivityColumn } from '@/features/leads/agenda/activity-column.types'
import type { AgendaBucket } from '@/features/leads/tasks/agenda-bucket-range'

/** Column titles for the activities board. Falls back to the built-in names until the catalogue loads. */
export function useActivityColumns(enabled: boolean) {
	const [state, setState] = useState<AsyncState<ActivityColumn[]>>({ status: 'idle', data: undefined, error: '' })
	const [actionError, setActionError] = useState<string | null>(null)

	async function load() {
		try {
			setState({ status: 'success', data: await fetchActivityColumns(), error: '' })
		} catch (cause) {
			setState({ status: 'error', data: undefined, error: (cause as Error).message })
		}
	}

	useEffect(() => {
		if (!enabled) return
		setState({ status: 'loading', data: undefined, error: '' })
		void load()
	}, [enabled])

	async function save(code: AgendaBucket, name: string): Promise<boolean> {
		setActionError(null)
		try {
			await renameActivityColumn(code, name)
			await load()
			return true
		} catch (cause) {
			setActionError((cause as Error).message)
			return false
		}
	}

	return {
		state,
		actionError,
		title: (bucket: AgendaBucket) => columnTitle(state.status === 'success' ? state.data : [], bucket),
		save,
	}
}
