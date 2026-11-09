'use client'

import * as React from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { AgendaByBucket } from '@/features/leads/agenda/agenda.types'
import { completeTask, fetchAgenda } from '@/features/leads/agenda/agenda-api'

const LOAD_ERROR = 'No fue posible cargar tus actividades. Inténtalo de nuevo.'

export function useActivityAgenda() {
	const [state, setState] = React.useState<AsyncState<AgendaByBucket>>({ status: 'loading', data: undefined, error: '' })
	const [actionError, setActionError] = React.useState<string | null>(null)

	async function reload() {
		try {
			setState({ status: 'success', data: await fetchAgenda(), error: '' })
		} catch {
			setState({ status: 'error', data: undefined, error: LOAD_ERROR })
		}
	}

	React.useEffect(() => {
		let cancelled = false
		fetchAgenda()
			.then((data) => !cancelled && setState({ status: 'success', data, error: '' }))
			.catch(() => !cancelled && setState({ status: 'error', data: undefined, error: LOAD_ERROR }))
		return () => {
			cancelled = true
		}
	}, [])

	async function complete(idLeadTask: number) {
		setActionError(null)
		try {
			await completeTask(idLeadTask)
			await reload()
		} catch {
			setActionError('No fue posible completar la tarea. Inténtalo de nuevo.')
		}
	}

	return { state, actionError, complete, reload }
}
