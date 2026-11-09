'use client'

import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import {
	completeLeadTaskRequest,
	createLeadTaskRequest,
	fetchLeadTasks,
	type LeadTaskDto,
	type NewLeadTask,
} from '@/features/leads/tasks/lead-tasks-api'

const LOAD_ERROR = 'No fue posible cargar las tareas. Inténtalo de nuevo.'

export function useLeadTasks(leadId: number, enabled: boolean) {
	const [state, setState] = React.useState<AsyncState<LeadTaskDto[]>>({ status: 'idle', data: undefined, error: '' })

	async function reload() {
		try {
			setState({ status: 'success', data: await fetchLeadTasks(leadId), error: '' })
		} catch {
			setState({ status: 'error', data: undefined, error: LOAD_ERROR })
		}
	}

	React.useEffect(() => {
		if (!enabled) return
		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })
		fetchLeadTasks(leadId)
			.then((data) => !cancelled && setState({ status: 'success', data, error: '' }))
			.catch(() => !cancelled && setState({ status: 'error', data: undefined, error: LOAD_ERROR }))
		return () => {
			cancelled = true
		}
	}, [leadId, enabled])

	/** Returns false when the request failed. */
	async function create(task: NewLeadTask): Promise<boolean> {
		try {
			await createLeadTaskRequest(leadId, task)
			await reload()
			return true
		} catch {
			return false
		}
	}

	async function complete(idLeadTask: number): Promise<boolean> {
		try {
			await completeLeadTaskRequest(idLeadTask)
			await reload()
			return true
		} catch {
			return false
		}
	}

	return { state, create, complete }
}
