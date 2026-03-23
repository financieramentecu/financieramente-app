'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	CompanyListResponse,
	CompanyFilters,
} from '../types/company.types'
import { companyApi } from '../lib/company-api'

interface UseCompaniesParams extends CompanyFilters {
	page?: number
	pageSize?: number
}

interface UseCompaniesReturn {
	state: AsyncState<CompanyListResponse>
	refetch: () => Promise<void>
}

/**
 * Hook to get the list of companies with pagination and search
 *
 * @param params - Search and pagination parameters
 * @returns Async state and refetch function
 *
 * @example
 * ```typescript
 * const { state, refetch } = useCompanies({ page: 1, pageSize: 10, search: 'Skandia' })
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <CompaniesTable companies={state.data.companies} />
 * }
 * ```
 */
export function useCompanies(
	params: UseCompaniesParams = {}
): UseCompaniesReturn {
	const [state, setState] = useState<AsyncState<CompanyListResponse>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchCompanies = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await companyApi.getCompanies(params)

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
			console.error('Error al obtener empresas:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener empresas',
			})
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.page, params.pageSize, params.search, params.status])

	useEffect(() => {
		fetchCompanies()
	}, [fetchCompanies])

	return {
		state,
		refetch: fetchCompanies,
	}
}
