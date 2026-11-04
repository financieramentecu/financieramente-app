'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { documentTypeApi } from '@/features/document-types/lib/document-type-api'
import type {
	CreateDocumentTypeInput,
	UpdateDocumentTypeInput,
} from '@/features/document-types/types/document-type.types'

export function useDocumentTypeMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const createDocumentType = async (input: CreateDocumentTypeInput) => {
		try {
			setIsSubmitting(true)
			const documentType = await documentTypeApi.create(input)
			toast.success('Tipo de documento creado')
			return documentType
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Error al crear el tipo de documento'
			toast.error('No se pudo crear el tipo de documento', {
				description: message,
			})
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const updateDocumentType = async (
		id: number,
		input: UpdateDocumentTypeInput
	) => {
		try {
			setIsSubmitting(true)
			const documentType = await documentTypeApi.update(id, input)
			toast.success(
				input.status === false
					? 'Tipo de documento inactivado'
					: input.status === true && Object.keys(input).length === 1
						? 'Tipo de documento activado'
						: 'Tipo de documento actualizado'
			)
			return documentType
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Error al actualizar el tipo de documento'
			toast.error('No se pudo actualizar el tipo de documento', {
				description: message,
			})
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	return {
		createDocumentType,
		updateDocumentType,
		isSubmitting,
	}
}
