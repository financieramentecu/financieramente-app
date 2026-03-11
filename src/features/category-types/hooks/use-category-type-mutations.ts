import { useState, useCallback } from 'react'
import { categoryTypeApi } from '../lib/category-type-api'
import {
    CreateCategoryTypeFormData,
    UpdateCategoryTypeFormData,
} from '../lib/category-type-schemas'
import { toast } from 'sonner'

export function useCategoryTypeMutations() {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const createCategoryType = useCallback(
        async (data: CreateCategoryTypeFormData) => {
            try {
                setIsSubmitting(true)
                const response = await categoryTypeApi.createCategoryType(data)

                if (response.data) {
                    toast.success('Tipo de categoría creado exitosamente')
                    return true
                }

                if (response.error) {
                    toast.error(response.error)
                }
                return false
            } catch {
                toast.error('Ocurrió un error al crear el tipo de categoría')
                return false
            } finally {
                setIsSubmitting(false)
            }
        },
        []
    )

    const updateCategoryType = useCallback(
        async (
            id: number,
            data: UpdateCategoryTypeFormData
        ): Promise<{ success: boolean; hasReferences?: boolean }> => {
            try {
                setIsSubmitting(true)
                const response = await categoryTypeApi.updateCategoryType(id, data)

                if (response.data) {
                    toast.success('Tipo de categoría actualizado exitosamente')
                    return {
                        success: true,
                        hasReferences: response.data.hasReferences,
                    }
                }

                if (response.error) {
                    toast.error(response.error)
                }
                return { success: false }
            } catch {
                toast.error('Ocurrió un error al actualizar el tipo de categoría')
                return { success: false }
            } finally {
                setIsSubmitting(false)
            }
        },
        []
    )

    const toggleCategoryTypeStatus = useCallback(
        async (id: number, currentStatus: boolean) => {
            try {
                const response = await categoryTypeApi.toggleStatus(id)

                if (response.data) {
                    toast.success(
                        `Tipo de categoría ${currentStatus ? 'desactivado' : 'activado'} exitosamente`
                    )
                    return true
                }

                if (response.error) {
                    toast.error(response.error)
                }
                return false
            } catch {
                toast.error('Ocurrió un error al cambiar el estado')
                return false
            }
        },
        []
    )

    return {
        createCategoryType,
        updateCategoryType,
        toggleCategoryTypeStatus,
        isSubmitting,
    }
}
