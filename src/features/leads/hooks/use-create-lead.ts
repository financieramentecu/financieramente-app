'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	createLeadSchema,
	type CreatedLead,
} from '@/features/leads/lib/create-lead.schema'

export function useCreateLead() {
	const [state, setState] = useState<AsyncState<CreatedLead>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	async function create(input: unknown): Promise<CreatedLead | null> {
		const parsed = createLeadSchema.safeParse(input)
		if (!parsed.success) {
			setState({
				status: 'error',
				data: undefined,
				error: parsed.error.issues[0]?.message ?? 'Datos inválidos',
			})
			return null
		}
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const response = await fetch('/api/leads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(parsed.data),
			})
			const body = (await response.json()) as ApiResponse<CreatedLead>
			if (!response.ok || !body.data)
				throw new Error(
					'error' in body ? body.error : 'No fue posible crear el lead'
				)
			setState({ status: 'success', data: body.data, error: '' })
			return body.data
		} catch (cause) {
			setState({
				status: 'error',
				data: undefined,
				error:
					cause instanceof Error
						? cause.message
						: 'No fue posible crear el lead',
			})
			return null
		}
	}
	return {
		state,
		create,
		reset: () => setState({ status: 'idle', data: undefined, error: '' }),
	}
}
