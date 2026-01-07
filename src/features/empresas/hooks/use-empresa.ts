'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { Empresa } from '../types/empresa.types'
import { empresaApi } from '../lib/empresa-api'

interface UseEmpresaReturn {
	state: AsyncState<Empresa>
	refetch: () => Promise<void>
}

/**
 * Hook para obtener una empresa por ID
 *
 * @param id - ID de la empresa a obtener
 * @returns Estado asíncrono y función de refetch
 *
 * @example
 * ```typescript
 * const { state, refetch } = useEmpresa(1)
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <EmpresaForm initialData={state.data} />
 * }
 * ```
 */
export function useEmpresa(id: number): UseEmpresaReturn {
	const [state, setState] = useState<AsyncState<Empresa>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchEmpresa = useCallback(async () => {
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
			const response = await empresaApi.getEmpresa(id)

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
		fetchEmpresa()
	}, [fetchEmpresa])

	return {
		state,
		refetch: fetchEmpresa,
	}
}

