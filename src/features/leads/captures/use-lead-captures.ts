'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { LeadCaptureOption } from './lead-capture.types'

export function useLeadCaptures(admin = false) {
	const [state, setState] = useState<AsyncState<LeadCaptureOption[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})
	const [revision, setRevision] = useState(0)
	useEffect(() => {
		let active = true
		setState({ status: 'loading', data: undefined, error: '' })
		void fetch(admin ? '/api/admin/lead-captures' : '/api/leads/captures')
			.then(async (response) => {
				const body = await response.json()
				if (!response.ok || !Array.isArray(body.data))
					throw new Error(body.error || 'No fue posible cargar las capturas')
				if (active) setState({ status: 'success', data: body.data, error: '' })
			})
			.catch((cause) => {
				if (active)
					setState({
						status: 'error',
						data: undefined,
						error:
							cause instanceof Error
								? cause.message
								: 'No fue posible cargar las capturas',
					})
			})
		return () => {
			active = false
		}
	}, [admin, revision])
	return { state, reload: () => setRevision((value) => value + 1) }
}
