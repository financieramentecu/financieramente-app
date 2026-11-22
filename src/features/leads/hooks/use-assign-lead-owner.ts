'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'

export interface AssignedLeadOwner {
	idUser: number
	ownerName: string
	assignedLeadIds?: number[]
}

const IDLE: AsyncState<AssignedLeadOwner> = {
	status: 'idle',
	data: undefined,
	error: '',
}

/** Assigns one hierarchy advisor to a lead. */
export function useAssignLeadOwner() {
	const [state, setState] = useState<AsyncState<AssignedLeadOwner>>(IDLE)

	async function assign(
		idLead: number,
		idUser: number
	): Promise<AssignedLeadOwner | null> {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const response = await fetch(`/api/leads/${idLead}/owner`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idUser }),
			})
			const body = (await response.json()) as {
				data?: AssignedLeadOwner | null
				error?: string
			}
			if (!response.ok || !body.data) {
				setState({
					status: 'error',
					data: undefined,
					error: body.error || 'No fue posible asignar el lead',
				})
				return null
			}
			setState({ status: 'success', data: body.data, error: '' })
			return body.data
		} catch {
			setState({
				status: 'error',
				data: undefined,
				error: 'No fue posible asignar el lead',
			})
			return null
		}
	}

	return { state, assign }
}
