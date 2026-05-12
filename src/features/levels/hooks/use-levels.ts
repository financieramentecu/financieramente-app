'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	LevelListResponse,
	LevelFilters,
} from '../types/level.types'
import { levelApi } from '../lib/level-api'

interface UseLevelsParams extends LevelFilters {
	page?: number
	pageSize?: number
}

interface UseLevelsReturn {
	state: AsyncState<LevelListResponse>
	refetch: () => Promise<void>
}

export function useLevels(params: UseLevelsParams = {}): UseLevelsReturn {
	const { page, pageSize, search, status, typeLevel } = params

	const [state, setState] = useState<AsyncState<LevelListResponse>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchLevels = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await levelApi.getLevels({
				page,
				pageSize,
				search,
				status,
				typeLevel,
			})

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
			console.error('Error al obtener niveles:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener niveles',
			})
		}
	}, [page, pageSize, search, status, typeLevel])

	useEffect(() => {
		fetchLevels()
	}, [fetchLevels])

	return {
		state,
		refetch: fetchLevels,
	}
}
