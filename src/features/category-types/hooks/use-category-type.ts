import { useState, useEffect, useCallback } from 'react'
import { categoryTypeApi } from '../lib/category-type-api'
import { CategoryType } from '../types/category-type.types'
import { AsyncState } from '@/features/shared/types/async-state.types'

export function useCategoryType(id?: number) {
    const [state, setState] = useState<AsyncState<CategoryType>>({
        status: 'idle',
        data: undefined,
        error: '',
    })

    const fetchCategoryType = useCallback(async (categoryTypeId: number) => {
        setState({ status: 'loading', data: undefined, error: '' })
        try {
            const response = await categoryTypeApi.getCategoryType(categoryTypeId)

            if (response.data) {
                setState({ status: 'success', data: response.data, error: '' })
            } else {
                setState({
                    status: 'error',
                    data: undefined,
                    error: response.error || 'Error al obtener el tipo de categoría',
                })
            }
        } catch (error) {
            setState({
                status: 'error',
                data: undefined,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Error al obtener el tipo de categoría',
            })
        }
    }, [])

    useEffect(() => {
        if (id) {
            fetchCategoryType(id)
        }
    }, [id, fetchCategoryType])

    return {
        ...state,
        refetch: () => id && fetchCategoryType(id),
    }
}
