'use client'

import { useState, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'

export interface MoneyStrategistDto {
	id: number
	name: string
}

/**
 * Loads all active users with role AGENTE for use in the agent multiselect filter.
 */
export function useMoneyStrategists(): AsyncState<MoneyStrategistDto[]> {
	const [state, setState] = useState<AsyncState<MoneyStrategistDto[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		let cancelled = false

		setState({ status: 'loading', data: undefined, error: '' })

		fetch('/api/admin/users?role=AGENTE&pageSize=500')
			.then(async (res) => {
				if (!res.ok) throw new Error('Error al cargar money strategists')
				const json = await res.json() as { data: { id: number; name: string; lastName?: string | null }[] }
				return json.data.map((u) => ({
					id: u.id,
					name: [u.name, u.lastName].filter(Boolean).join(' '),
				}))
			})
			.then((data) => {
				if (!cancelled) setState({ status: 'success', data, error: '' })
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					const msg = err instanceof Error ? err.message : 'Error al cargar money strategists'
					setState({ status: 'error', data: undefined, error: msg })
				}
			})

		return () => { cancelled = true }
	}, [])

	return state
}
