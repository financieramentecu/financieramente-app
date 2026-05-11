'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { levelApi } from '../lib/level-api'
import type {
	CreateLevelInput,
	UpdateLevelInput,
} from '../types/level.types'

export function useAdminLevelMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const createLevel = async (data: CreateLevelInput) => {
		try {
			setIsSubmitting(true)
			const response = await levelApi.createLevel(data)

			if ('error' in response && response.error) {
				toast.error('Error al crear nivel', {
					description: response.error,
				})
				throw new Error(response.error)
			}

			toast.success('Nivel creado exitosamente')
			return response.data
		} catch (error) {
			if (!(error instanceof Error) || !error.message) {
				toast.error('Error al crear nivel', {
					description: 'Error desconocido',
				})
			}
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const updateLevel = async (id: number, data: UpdateLevelInput) => {
		try {
			setIsSubmitting(true)
			const response = await levelApi.updateLevel(id, data)

			if ('error' in response && response.error) {
				toast.error('Error al actualizar nivel', {
					description: response.error,
				})
				throw new Error(response.error)
			}

			toast.success('Nivel actualizado exitosamente')
			return response.data
		} catch (error) {
			if (!(error instanceof Error) || !error.message) {
				toast.error('Error al actualizar nivel', {
					description: 'Error desconocido',
				})
			}
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const deleteLevel = async (id: number) => {
		try {
			setIsSubmitting(true)
			const response = await levelApi.deactivateLevel(id)

			if ('error' in response && response.error) {
				toast.error('Error al desactivar nivel', {
					description: response.error,
				})
				throw new Error(response.error)
			}

			toast.success('Nivel desactivado exitosamente')
		} catch (error) {
			if (!(error instanceof Error) || !error.message) {
				toast.error('Error al desactivar nivel', {
					description: 'Error desconocido',
				})
			}
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	return {
		createLevel,
		updateLevel,
		deleteLevel,
		isSubmitting,
	}
}
