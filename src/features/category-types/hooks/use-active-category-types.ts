'use client'

import { useState, useEffect, useCallback } from 'react'
import { categoryTypeApi } from '../lib/category-type-api'
import type { CategoryType } from '../types/category-type.types'
import { AsyncState } from '@/features/shared/types/async-state.types'

export function useActiveCategoryTypes() {
    const [state, setState] = useState<AsyncState<CategoryType[]>>({
        status: 'idle',
        data: undefined,
        error: '',
    })

    const fetchActiveCategoryTypes = useCallback(async () => {
        setState({
            status: 'loading',
            data: undefined,
            error: ''
        })

        try {
            const response = await categoryTypeApi.getActiveCategoryTypes()

            if (response.data) {
                setState({ status: 'success', data: response.data, error: '' })
            } else {
                setState({
                    status: 'error',
                    data: undefined,
                    error: response.error || 'Error al obtener tipos de categoría activos',
                })
            }
        } catch (error) {
            setState({
                status: 'error',
                data: undefined,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Error al obtener tipos de categoría activos',
            })
        }
    }, [])

    useEffect(() => {
        fetchActiveCategoryTypes()
    }, [fetchActiveCategoryTypes])

    return {
        state,
        refetch: fetchActiveCategoryTypes,
    }
}
