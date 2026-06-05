'use client'

import { useState, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'

export interface MoneyStrategistDto {
	id: number
	name: string
}

interface MoneyStrategistResult {
	strategists: MoneyStrategistDto[]
	showFilter: boolean
}

export function useMoneyStrategists(): AsyncState<MoneyStrategistResult> {
	const [state, setState] = useState<AsyncState<MoneyStrategistResult>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		let cancelled = false

		setState({ status: 'loading', data: undefined, error: '' })

		fetch('/api/agents')
			.then(async (res) => {
				if (!res.ok) throw new Error('Error al cargar money strategists')
				const json = await res.json() as {
					data: { agents: { id: number; name: string; lastName?: string | null }[]; showFilter: boolean }
				}
				return {
					strategists: json.data.agents.map((u) => ({
						id: u.id,
						name: [u.name, u.lastName].filter(Boolean).join(' '),
					})),
					showFilter: json.data.showFilter,
				}
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
