'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	EmpresaListResponse,
	EmpresaFilters,
} from '../types/empresa.types'
import { empresaApi } from '../lib/empresa-api'

interface UseEmpresasParams extends EmpresaFilters {
	page?: number
	pageSize?: number
}

interface UseEmpresasReturn {
	state: AsyncState<EmpresaListResponse>
	refetch: () => Promise<void>
}

/**
 * Hook para obtener la lista de empresas con paginación y búsqueda
 *
 * @param params - Parámetros de búsqueda y paginación
 * @returns Estado asíncrono y función de refetch
 *
 * @example
 * ```typescript
 * const { state, refetch } = useEmpresas({ page: 1, pageSize: 10, search: 'Skandia' })
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <EmpresasTable empresas={state.data.empresas} />
 * }
 * ```
 */
export function useEmpresas(params: UseEmpresasParams = {}): UseEmpresasReturn {
	const [state, setState] = useState<AsyncState<EmpresaListResponse>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchEmpresas = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await empresaApi.getEmpresas(params)

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
	}, [params.page, params.pageSize, params.search, params.status])

	useEffect(() => {
		fetchEmpresas()
	}, [fetchEmpresas])

	return {
		state,
		refetch: fetchEmpresas,
	}
}
