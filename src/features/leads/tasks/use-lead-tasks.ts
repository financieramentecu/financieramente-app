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
	const loadedLeadId = React.useRef<number | null>(null)

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
		const sameLead = loadedLeadId.current === leadId
		if (!sameLead) setState({ status: 'loading', data: undefined, error: '' })
		fetchLeadTasks(leadId)
			.then((data) => {
				if (cancelled) return
				loadedLeadId.current = leadId
				setState({ status: 'success', data, error: '' })
			})
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

	async function complete(
		idLeadTask: number,
		note: { comment?: string; files?: readonly File[] } = {}
	): Promise<boolean> {
		try {
			await completeLeadTaskRequest(idLeadTask, note)
			await reload()
			return true
		} catch {
			return false
		}
	}

	return { state, create, complete }
}
