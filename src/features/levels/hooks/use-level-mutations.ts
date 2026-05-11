'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	Level,
	CreateLevelInput,
	UpdateLevelInput,
} from '../types/level.types'
import { levelApi } from '../lib/level-api'

interface UseLevelMutationsReturn {
	createState: AsyncState<Level>
	updateState: AsyncState<Level>
	deleteState: AsyncState<void>
	createLevel: (data: CreateLevelInput) => Promise<void>
	updateLevel: (id: number, data: UpdateLevelInput) => Promise<void>
	deleteLevel: (id: number) => Promise<void>
}

export function useLevelMutations(): UseLevelMutationsReturn {
	const [createState, setCreateState] = useState<AsyncState<Level>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [updateState, setUpdateState] = useState<AsyncState<Level>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [deleteState, setDeleteState] = useState<AsyncState<void>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const createLevel = useCallback(async (data: CreateLevelInput) => {
		setCreateState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await levelApi.createLevel(data)

			if ('error' in response) {
				setCreateState({
					status: 'error',
					data: undefined,
					error: response.error,
				})
			} else {
				setCreateState({
					status: 'success',
					data: response.data,
					error: '',
				})
			}
		} catch (error) {
			console.error('Error al crear nivel:', error)
			setCreateState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear nivel',
			})
		}
	}, [])

	const updateLevel = useCallback(
		async (id: number, data: UpdateLevelInput) => {
			setUpdateState({ status: 'loading', data: undefined, error: '' })

			try {
				const response = await levelApi.updateLevel(id, data)

				if ('error' in response) {
					setUpdateState({
						status: 'error',
						data: undefined,
						error: response.error,
					})
				} else {
					setUpdateState({
						status: 'success',
						data: response.data,
						error: '',
					})
				}
			} catch (error) {
				console.error('Error al actualizar nivel:', error)
				setUpdateState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al actualizar nivel',
				})
			}
		},
		[]
	)

	const deleteLevel = useCallback(async (id: number) => {
		setDeleteState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await levelApi.deleteLevel(id)

			if ('error' in response) {
				setDeleteState({
					status: 'error',
					data: undefined,
					error: response.error,
				})
			} else {
				setDeleteState({
					status: 'success',
					data: undefined,
					error: '',
				})
			}
		} catch (error) {
			console.error('Error al eliminar nivel:', error)
			setDeleteState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar nivel',
			})
		}
	}, [])

	return {
		createState,
		updateState,
		deleteState,
		createLevel,
		updateLevel,
		deleteLevel,
	}
}
