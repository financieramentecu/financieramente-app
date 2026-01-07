'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	Empresa,
	CreateEmpresaInput,
	UpdateEmpresaInput,
} from '../types/empresa.types'
import { empresaApi } from '../lib/empresa-api'

interface UseEmpresaMutationsReturn {
	createState: AsyncState<Empresa>
	updateState: AsyncState<Empresa>
	deleteState: AsyncState<void>
	createEmpresa: (data: CreateEmpresaInput) => Promise<void>
	updateEmpresa: (id: number, data: UpdateEmpresaInput) => Promise<void>
	deleteEmpresa: (id: number) => Promise<void>
}

/**
 * Hook para mutaciones de empresas (crear, actualizar, eliminar)
 *
 * @returns Estados asíncronos y funciones de mutación
 *
 * @example
 * ```typescript
 * const { createEmpresa, createState } = useEmpresaMutations()
 *
 * const handleSubmit = async (data: CreateEmpresaInput) => {
 *   await createEmpresa(data)
 *   if (createState.status === 'success') {
 *     router.push('/dashboard/empresas')
 *   }
 * }
 * ```
 */
export function useEmpresaMutations(): UseEmpresaMutationsReturn {
	const [createState, setCreateState] = useState<AsyncState<Empresa>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [updateState, setUpdateState] = useState<AsyncState<Empresa>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [deleteState, setDeleteState] = useState<AsyncState<void>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const createEmpresa = useCallback(async (data: CreateEmpresaInput) => {
		setCreateState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await empresaApi.createEmpresa(data)

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
			console.error('Error al crear empresa:', error)
			setCreateState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear empresa',
			})
		}
	}, [])

	const updateEmpresa = useCallback(
		async (id: number, data: UpdateEmpresaInput) => {
			setUpdateState({ status: 'loading', data: undefined, error: '' })

			try {
				const response = await empresaApi.updateEmpresa(id, data)

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
				console.error('Error al actualizar empresa:', error)
				setUpdateState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al actualizar empresa',
				})
			}
		},
		[]
	)

	const deleteEmpresa = useCallback(async (id: number) => {
		setDeleteState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await empresaApi.deleteEmpresa(id)

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
			console.error('Error al eliminar empresa:', error)
			setDeleteState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar empresa',
			})
		}
	}, [])

	return {
		createState,
		updateState,
		deleteState,
		createEmpresa,
		updateEmpresa,
		deleteEmpresa,
	}
}

