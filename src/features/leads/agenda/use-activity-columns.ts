'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { createActivityColumn, deleteActivityColumn, fetchActivityColumns, renameActivityColumn } from '@/features/leads/agenda/activity-columns-api'
import { BUILTIN_ACTIVITY_COLUMNS, type ActivityColumn } from '@/features/leads/agenda/activity-column.types'

/** Visible board columns. Falls back to the four due-date columns until the catalogue loads. */
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

	async function run(action: () => Promise<void>): Promise<boolean> {
		setActionError(null)
		try {
			await action()
			await load()
			return true
		} catch (cause) {
			setActionError((cause as Error).message)
			return false
		}
	}

	const columns = state.status === 'success' && state.data.length > 0 ? state.data : BUILTIN_ACTIVITY_COLUMNS

	return {
		state,
		actionError,
		columns,
		save: (code: string, name: string) => run(() => renameActivityColumn(code, name).then(() => undefined)),
		add: (name: string) => run(() => createActivityColumn(name).then(() => undefined)),
		remove: (code: string) => run(() => deleteActivityColumn(code)),
	}
}
