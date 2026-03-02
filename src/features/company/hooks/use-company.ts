'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { Company } from '../types/company.types'
import { companyApi } from '../lib/company-api'

interface UseCompanyReturn {
	state: AsyncState<Company>
	refetch: () => Promise<void>
}

/**
 * Hook to get a company by ID
 *
 * @param id - Company ID to fetch
 * @returns Async state and refetch function
 *
 * @example
 * ```typescript
 * const { state, refetch } = useCompany(1)
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <CompanyForm initialData={state.data} />
 * }
 * ```
 */
export function useCompany(id: number): UseCompanyReturn {
	const [state, setState] = useState<AsyncState<Company>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchCompany = useCallback(async () => {
		if (!id) {
			setState({
				status: 'error',
				data: undefined,
				error: 'ID de empresa no válido',
			})
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await companyApi.getCompany(id)

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
			console.error('Error al obtener empresa:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener empresa',
			})
		}
	}, [id])

	useEffect(() => {
		fetchCompany()
	}, [fetchCompany])

	return {
		state,
		refetch: fetchCompany,
	}
}
