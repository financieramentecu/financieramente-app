'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { Level } from '../types/level.types'
import { levelApi } from '../lib/level-api'

interface UseLevelReturn {
	state: AsyncState<Level>
}

export function useLevel(id: number): UseLevelReturn {
	const [state, setState] = useState<AsyncState<Level>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchLevel = useCallback(async () => {
		if (!id || id <= 0) {
			setState({
				status: 'error',
				data: undefined,
				error: 'ID de nivel inválido',
			})
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await levelApi.getLevel(id)

			if ('error' in response) {
				setState({
					status: 'error',
					data: undefined,
					error: response.error,
				})
			} else {
				setState({
					status: 'success',
					data: response.data,
					error: '',
				})
			}
		} catch (error) {
			console.error('Error al obtener nivel:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener nivel',
			})
		}
	}, [id])

	useEffect(() => {
		fetchLevel()
	}, [fetchLevel])

	return {
		state,
	}
}
