'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadStageStayDto } from '@/features/leads/types/lead-stage-stay.types'

const IDLE: AsyncState<LeadStageStayDto[]> = {
	status: 'idle',
	data: undefined,
	error: '',
}
const LOADING: AsyncState<LeadStageStayDto[]> = {
	status: 'loading',
	data: undefined,
	error: '',
}
const LOAD_ERROR = 'No fue posible cargar el historial. Inténtalo de nuevo.'

export function useLeadStageStays(leadId: number, enabled: boolean) {
	const [state, setState] = useState<AsyncState<LeadStageStayDto[]>>(IDLE)

	useEffect(() => {
		if (!enabled) return
		let cancelled = false
		setState(LOADING)
		fetch(`/api/leads/${leadId}/stage-history`)
			.then(async (response) => {
				if (!response.ok) throw new Error('stage-history')
				return (await response.json()) as ApiResponse<LeadStageStayDto[]>
			})
			.then((body) => {
				if (!cancelled)
					setState({ status: 'success', data: body.data ?? [], error: '' })
			})
			.catch(() => {
				if (!cancelled)
					setState({ status: 'error', data: undefined, error: LOAD_ERROR })
			})
		return () => {
			cancelled = true
		}
	}, [leadId, enabled])

	return { state }
}
