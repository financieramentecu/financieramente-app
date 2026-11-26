'use client'

import { useEffect, useState } from 'react'
import { fetchOriginOptions } from '@/features/leads/table/lead-table-api'
import type { LeadOriginOption } from '@/features/leads/table/lead-origin-options.service'
import type { AsyncState } from '@/features/shared/types/async-state.types'

const idle: AsyncState<LeadOriginOption[]> = {
	status: 'idle',
	data: undefined,
	error: '',
}

/** Active `client_origin` rows for the pipeline origin filter. A failed load leaves the list empty. */
export function useLeadOriginOptions(revision = 0): LeadOriginOption[] {
	const [state, setState] = useState<AsyncState<LeadOriginOption[]>>(idle)

	useEffect(() => {
		let cancelled = false
		setState({ status: 'loading', data: undefined, error: '' })
		fetchOriginOptions()
			.then((data) => {
				if (!cancelled) setState({ status: 'success', data, error: '' })
			})
			.catch(() => {
				if (!cancelled) {
					setState({
						status: 'error',
						data: undefined,
						error: 'No fue posible cargar los orígenes.',
					})
				}
			})
		return () => {
			cancelled = true
		}
	}, [revision])

	return state.status === 'success' ? state.data : []
}
