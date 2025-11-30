'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { periodicityApi } from '../lib/periodicity-api'
import type {
	CreatePeriodicityInput,
	UpdatePeriodicityInput,
} from '../types/periodicity.types'

export function usePeriodicityMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const createPeriodicity = async (data: CreatePeriodicityInput) => {
		try {
			setIsSubmitting(true)
			const periodicity = await periodicityApi.createPeriodicity(data)
			toast.success('Periodicidad creada exitosamente')
			return periodicity
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al crear periodicidad'
			toast.error('Error al crear periodicidad', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const updatePeriodicity = async (
		id: number,
		data: UpdatePeriodicityInput
	) => {
		try {
			setIsSubmitting(true)
			const periodicity = await periodicityApi.updatePeriodicity(id, data)
			toast.success('Periodicidad actualizada exitosamente')
			return periodicity
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Error al actualizar periodicidad'
			toast.error('Error al actualizar periodicidad', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const deletePeriodicity = async (id: number) => {
		try {
			setIsSubmitting(true)
			await periodicityApi.deletePeriodicity(id)
			toast.success('Periodicidad eliminada exitosamente')
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Error al eliminar periodicidad'
			toast.error('Error al eliminar periodicidad', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	return {
		createPeriodicity,
		updatePeriodicity,
		deletePeriodicity,
		isSubmitting,
	}
}
