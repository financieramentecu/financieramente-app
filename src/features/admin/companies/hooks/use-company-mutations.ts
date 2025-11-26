'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { companyApi } from '../lib/company-api'
import type {
	CreateCompanyInput,
	UpdateCompanyInput,
} from '../types/company.types'

export function useCompanyMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const createCompany = async (data: CreateCompanyInput) => {
		try {
			setIsSubmitting(true)
			const company = await companyApi.createCompany(data)
			toast.success('Compañía creada exitosamente')
			return company
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al crear compañía'
			toast.error('Error al crear compañía', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const updateCompany = async (id: number, data: UpdateCompanyInput) => {
		try {
			setIsSubmitting(true)
			const company = await companyApi.updateCompany(id, data)
			toast.success('Compañía actualizada exitosamente')
			return company
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al actualizar compañía'
			toast.error('Error al actualizar compañía', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const deleteCompany = async (id: number) => {
		try {
			setIsSubmitting(true)
			await companyApi.deleteCompany(id)
			toast.success('Compañía eliminada exitosamente')
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al eliminar compañía'
			toast.error('Error al eliminar compañía', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	return {
		createCompany,
		updateCompany,
		deleteCompany,
		isSubmitting,
	}
}
