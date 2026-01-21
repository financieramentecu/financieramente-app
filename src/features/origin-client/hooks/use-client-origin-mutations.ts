'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	ClientOrigin,
	CreateClientOriginInput,
	UpdateClientOriginInput,
} from '../types/client-origin.types'
import { clientOriginApi } from '../lib/client-origin-api'

interface UseClientOriginMutationsReturn {
	createState: AsyncState<ClientOrigin>
	updateState: AsyncState<ClientOrigin>
	deleteState: AsyncState<void>
	createClientOrigin: (data: CreateClientOriginInput) => Promise<void>
	updateClientOrigin: (
		id: number,
		data: UpdateClientOriginInput
	) => Promise<void>
	deleteClientOrigin: (id: number) => Promise<void>
}

/**
 * Hook para mutaciones de orígenes de cliente (crear, actualizar, eliminar)
 *
 * @returns Estados asíncronos y funciones de mutación
 *
 * @example
 * ```typescript
 * const { createClientOrigin, createState } = useClientOriginMutations()
 *
 * const handleSubmit = async (data: CreateClientOriginInput) => {
 *   await createClientOrigin(data)
 *   if (createState.status === 'success') {
 *     router.push('/dashboard/origenes')
 *   }
 * }
 * ```
 */
export function useClientOriginMutations(): UseClientOriginMutationsReturn {
	const [createState, setCreateState] = useState<AsyncState<ClientOrigin>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [updateState, setUpdateState] = useState<AsyncState<ClientOrigin>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [deleteState, setDeleteState] = useState<AsyncState<void>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const createClientOrigin = useCallback(
		async (data: CreateClientOriginInput) => {
			setCreateState({ status: 'loading', data: undefined, error: '' })

			try {
				const response = await clientOriginApi.createClientOrigin(data)

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
				console.error('Error al crear origen de cliente:', error)
				setCreateState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al crear origen de cliente',
				})
			}
		},
		[]
	)

	const updateClientOrigin = useCallback(
		async (id: number, data: UpdateClientOriginInput) => {
			setUpdateState({ status: 'loading', data: undefined, error: '' })

			try {
				const response = await clientOriginApi.updateClientOrigin(id, data)

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
				console.error('Error al actualizar origen de cliente:', error)
				setUpdateState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al actualizar origen de cliente',
				})
			}
		},
		[]
	)

	const deleteClientOrigin = useCallback(async (id: number) => {
		setDeleteState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await clientOriginApi.deleteClientOrigin(id)

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
			console.error('Error al eliminar origen de cliente:', error)
			setDeleteState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar origen de cliente',
			})
		}
	}, [])

	return {
		createState,
		updateState,
		deleteState,
		createClientOrigin,
		updateClientOrigin,
		deleteClientOrigin,
	}
}
