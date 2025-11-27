'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { currencyApi } from '../lib/currency-api'
import type {
	CreateCurrencyInput,
	UpdateCurrencyInput,
} from '../types/currency.types'

export function useCurrencyMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const createCurrency = async (data: CreateCurrencyInput) => {
		try {
			setIsSubmitting(true)
			const currency = await currencyApi.createCurrency(data)
			toast.success('Moneda creada exitosamente')
			return currency
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al crear moneda'
			toast.error('Error al crear moneda', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const updateCurrency = async (id: number, data: UpdateCurrencyInput) => {
		try {
			setIsSubmitting(true)
			const currency = await currencyApi.updateCurrency(id, data)
			toast.success('Moneda actualizada exitosamente')
			return currency
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al actualizar moneda'
			toast.error('Error al actualizar moneda', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const deleteCurrency = async (id: number) => {
		try {
			setIsSubmitting(true)
			await currencyApi.deleteCurrency(id)
			toast.success('Moneda eliminada exitosamente')
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al eliminar moneda'
			toast.error('Error al eliminar moneda', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	return {
		createCurrency,
		updateCurrency,
		deleteCurrency,
		isSubmitting,
	}
}
