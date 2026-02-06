'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	ProductConfiguration,
	CreateProductConfigurationInput,
	UpdateProductConfigurationInput,
} from '../types/product-configuration.types'
import { productConfigurationApi } from '../lib/product-configuration-api'

interface UseProductConfigurationMutationsReturn {
	createState: AsyncState<ProductConfiguration>
	updateState: AsyncState<ProductConfiguration>
	toggleActiveState: AsyncState<ProductConfiguration>
	createProductConfiguration: (
		data: CreateProductConfigurationInput
	) => Promise<void>
	updateProductConfiguration: (
		id: number,
		data: UpdateProductConfigurationInput
	) => Promise<void>
	toggleActive: (id: number, active: boolean) => Promise<void>
}

/**
 * Hook for product configuration mutations (create, update, toggleActive)
 */
export function useProductConfigurationMutations(): UseProductConfigurationMutationsReturn {
	const [createState, setCreateState] = useState<
		AsyncState<ProductConfiguration>
	>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [updateState, setUpdateState] = useState<
		AsyncState<ProductConfiguration>
	>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [toggleActiveState, setToggleActiveState] = useState<
		AsyncState<ProductConfiguration>
	>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const createProductConfiguration = useCallback(
		async (data: CreateProductConfigurationInput) => {
			setCreateState({
				status: 'loading',
				data: undefined,
				error: '',
			})

			try {
				const response =
					await productConfigurationApi.createProductConfiguration(
						data
					)

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
				console.error(
					'Error al crear configuración de producto:',
					error
				)
				setCreateState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al crear configuración de producto',
				})
			}
		},
		[]
	)

	const updateProductConfiguration = useCallback(
		async (id: number, data: UpdateProductConfigurationInput) => {
			setUpdateState({
				status: 'loading',
				data: undefined,
				error: '',
			})

			try {
				const response =
					await productConfigurationApi.updateProductConfiguration(
						id,
						data
					)

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
				console.error(
					'Error al actualizar configuración de producto:',
					error
				)
				setUpdateState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al actualizar configuración de producto',
				})
			}
		},
		[]
	)

	const toggleActive = useCallback(
		async (id: number, active: boolean) => {
			setToggleActiveState({
				status: 'loading',
				data: undefined,
				error: '',
			})

			try {
				const response =
					await productConfigurationApi.toggleActive(id, active)

				if ('error' in response) {
					setToggleActiveState({
						status: 'error',
						data: undefined,
						error: response.error,
					})
				} else {
					setToggleActiveState({
						status: 'success',
						data: response.data,
						error: '',
					})
				}
			} catch (error) {
				console.error(
					'Error al cambiar estado de configuración de producto:',
					error
				)
				setToggleActiveState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al cambiar estado de configuración de producto',
				})
			}
		},
		[]
	)

	return {
		createState,
		updateState,
		toggleActiveState,
		createProductConfiguration,
		updateProductConfiguration,
		toggleActive,
	}
}
