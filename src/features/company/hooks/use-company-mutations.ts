'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	Company,
	CreateCompanyInput,
	UpdateCompanyInput,
} from '../types/company.types'
import { companyApi } from '../lib/company-api'

interface UseCompanyMutationsReturn {
	createState: AsyncState<Company>
	updateState: AsyncState<Company>
	deleteState: AsyncState<void>
	createCompany: (data: CreateCompanyInput) => Promise<ApiResponse<Company>>
	updateCompany: (id: number, data: UpdateCompanyInput) => Promise<ApiResponse<Company>>
	deleteCompany: (id: number) => Promise<ApiResponse<void>>
}

/**
 * Hook for company mutations (create, update, delete)
 *
 * @returns Async states and mutation functions
 *
 * @example
 * ```typescript
 * const { createCompany, createState } = useCompanyMutations()
 *
 * const handleSubmit = async (data: CreateCompanyInput) => {
 *   await createCompany(data)
 *   if (createState.status === 'success') {
 *     router.push('/dashboard/admin/companies')
 *   }
 * }
 * ```
 */
export function useCompanyMutations(): UseCompanyMutationsReturn {
	const [createState, setCreateState] = useState<AsyncState<Company>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [updateState, setUpdateState] = useState<AsyncState<Company>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [deleteState, setDeleteState] = useState<AsyncState<void>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const createCompany = useCallback(async (data: CreateCompanyInput) => {
		setCreateState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await companyApi.createCompany(data)

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
			return response
		} catch (error) {
			console.error('Error al crear empresa:', error)
			const errorResponse: ApiResponse<Company> = {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear empresa',
			}
			setCreateState({
				status: 'error',
				data: undefined,
				error: errorResponse.error,
			})
			return errorResponse
		}
	}, [])

	const updateCompany = useCallback(
		async (id: number, data: UpdateCompanyInput) => {
			setUpdateState({ status: 'loading', data: undefined, error: '' })

			try {
				const response = await companyApi.updateCompany(id, data)

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
				return response
			} catch (error) {
				console.error('Error al actualizar empresa:', error)
				const errorResponse: ApiResponse<Company> = {
					data: null,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al actualizar empresa',
				}
				setUpdateState({
					status: 'error',
					data: undefined,
					error: errorResponse.error,
				})
				return errorResponse
			}
		},
		[]
	)

	const deleteCompany = useCallback(async (id: number) => {
		setDeleteState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await companyApi.deleteCompany(id)

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
			return response
		} catch (error) {
			console.error('Error al eliminar empresa:', error)
			const errorResponse: ApiResponse<void> = {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar empresa',
			}
			setDeleteState({
				status: 'error',
				data: undefined,
				error: errorResponse.error,
			})
			return errorResponse
		}
	}, [])

	return {
		createState,
		updateState,
		deleteState,
		createCompany,
		updateCompany,
		deleteCompany,
	}
}
