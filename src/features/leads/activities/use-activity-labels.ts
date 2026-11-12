'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ActivityLabel } from '@/features/leads/activities/activity-label.types'
import {
	createActivityLabel,
	deleteActivityLabel,
	fetchActivityLabels,
	updateActivityLabel,
} from '@/features/leads/activities/activity-labels-api'

/** Activity label catalogue for managers configuring the activities board. */
export function useActivityLabels(enabled: boolean) {
	const [state, setState] = useState<AsyncState<ActivityLabel[]>>({ status: 'idle', data: undefined, error: '' })
	const [actionError, setActionError] = useState<string | null>(null)

	async function load() {
		try {
			setState({ status: 'success', data: await fetchActivityLabels(), error: '' })
		} catch (cause) {
			setState({ status: 'error', data: undefined, error: (cause as Error).message })
		}
	}

	useEffect(() => {
		if (!enabled) return
		setState({ status: 'loading', data: undefined, error: '' })
		void load()
	}, [enabled])

	async function run(action: () => Promise<unknown>): Promise<boolean> {
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

	return {
		state,
		actionError,
		addLabel: (name: string, color: string) => run(() => createActivityLabel({ name, color })),
		saveLabel: (idLeadActivityLabel: number, name: string, color: string) =>
			run(() => updateActivityLabel(idLeadActivityLabel, { name, color })),
		removeLabel: (idLeadActivityLabel: number) => run(() => deleteActivityLabel(idLeadActivityLabel)),
	}
}
