/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { originsApi } from '@/features/origins/lib/origins-api'
import type {
	ProductOrigin,
	ClientOrigin,
	CreateProductOriginInput,
	UpdateProductOriginInput,
	CreateClientOriginInput,
	UpdateClientOriginInput,
} from '@/features/origins/types/origins.types'

/**
 * Hook para obtener la lista de orígenes de producto
 *
 * @returns Estado asíncrono y función de refetch
 *
 * @example
 * ```typescript
 * const { state, refetch } = useProductOrigins()
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <OriginsTable origins={state.data} />
 * }
 * ```
 */
export function useProductOrigins() {
	const [state, setState] = useState<AsyncState<ProductOrigin[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchOrigins = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const origins = await originsApi.getProductOrigins()
			setState({
				status: 'success',
				data: origins,
				error: '',
			})
		} catch (error) {
			console.error('Error al obtener orígenes de producto:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener orígenes de producto',
			})
		}
	}, [])

	useEffect(() => {
		fetchOrigins()
	}, [fetchOrigins])

	return {
		state,
		refetch: fetchOrigins,
	}
}

/**
 * Hook para obtener la lista de orígenes de cliente
 *
 * @returns Estado asíncrono y función de refetch
 *
 * @example
 * ```typescript
 * const { state, refetch } = useClientOrigins()
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <OriginsTable origins={state.data} />
 * }
 * ```
 */
export function useClientOrigins() {
	const [state, setState] = useState<AsyncState<ClientOrigin[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchOrigins = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await originsApi.getClientOrigins()
			if ('data' in response && response.data) {
				setState({
					status: 'success',
					data: response.data.origins,
					error: '',
				})
			} else {
				setState({
					status: 'error',
					data: undefined,
					error: (response as any).error || 'Error al obtener orígenes',
				})
			}
		} catch (error) {
			console.error('Error al obtener orígenes de cliente:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener orígenes de cliente',
			})
		}
	}, [])

	useEffect(() => {
		fetchOrigins()
	}, [fetchOrigins])

	return {
		state,
		refetch: fetchOrigins,
	}
}

/**
 * Hook para mutaciones de orígenes de producto
 *
 * @returns Funciones para crear, actualizar y eliminar orígenes de producto
 */
export function useProductOriginMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const create = useCallback(async (data: CreateProductOriginInput) => {
		setIsSubmitting(true)
		try {
			const result = await originsApi.createProductOrigin(data)
			return { success: true, data: result }
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear origen de producto',
			}
		} finally {
			setIsSubmitting(false)
		}
	}, [])

	const update = useCallback(
		async (id: number, data: UpdateProductOriginInput) => {
			setIsSubmitting(true)
			try {
				const result = await originsApi.updateProductOrigin(id, data)
				return { success: true, data: result }
			} catch (error) {
				return {
					success: false,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al actualizar origen de producto',
				}
			} finally {
				setIsSubmitting(false)
			}
		},
		[]
	)

	const remove = useCallback(async (id: number) => {
		setIsSubmitting(true)
		try {
			await originsApi.deleteProductOrigin(id)
			return { success: true }
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar origen de producto',
			}
		} finally {
			setIsSubmitting(false)
		}
	}, [])

	return {
		create,
		update,
		remove,
		isSubmitting,
	}
}

/**
 * Hook para mutaciones de orígenes de cliente
 *
 * @returns Funciones para crear, actualizar y eliminar orígenes de cliente
 */
export function useClientOriginMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const create = useCallback(async (data: CreateClientOriginInput) => {
		setIsSubmitting(true)
		try {
			const result = await originsApi.createClientOrigin(data)
			return { success: true, data: result }
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear origen de cliente',
			}
		} finally {
			setIsSubmitting(false)
		}
	}, [])

	const update = useCallback(
		async (id: number, data: UpdateClientOriginInput) => {
			setIsSubmitting(true)
			try {
				const result = await originsApi.updateClientOrigin(id, data)
				return { success: true, data: result }
			} catch (error) {
				return {
					success: false,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al actualizar origen de cliente',
				}
			} finally {
				setIsSubmitting(false)
			}
		},
		[]
	)

	const remove = useCallback(async (id: number) => {
		setIsSubmitting(true)
		try {
			await originsApi.deleteClientOrigin(id)
			return { success: true }
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar origen de cliente',
			}
		} finally {
			setIsSubmitting(false)
		}
	}, [])

	return {
		create,
		update,
		remove,
		isSubmitting,
	}
}
