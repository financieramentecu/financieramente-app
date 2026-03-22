'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
	createCommissionDiscount,
	inactivateCommissionDiscount,
} from '@/features/commission-discounts/lib/commission-discount-api'
import type { CreateCommissionDiscountInput } from '@/features/commission-discounts/types/commission-discount.types'

interface MutationOptions {
	onSuccess?: () => void
	onError?: (error: Error) => void
}

export function useCommissionDiscountMutations({ onSuccess, onError }: MutationOptions = {}) {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const createDiscount = async (input: CreateCommissionDiscountInput) => {
		try {
			setIsSubmitting(true)
			await createCommissionDiscount(input)
			toast.success('Descuento creado exitosamente')
			onSuccess?.()
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Error desconocido')
			toast.error('Error al crear descuento', { description: error.message })
			onError?.(error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const inactivateDiscount = async (id: number) => {
		try {
			setIsSubmitting(true)
			await inactivateCommissionDiscount(id)
			toast.success('Descuento inactivado exitosamente')
			onSuccess?.()
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Error desconocido')
			toast.error('Error al inactivar descuento', { description: error.message })
			onError?.(error)
		} finally {
			setIsSubmitting(false)
		}
	}

	return { createDiscount, inactivateDiscount, isSubmitting }
}
