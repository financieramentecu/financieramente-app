'use client'

import { useState, useEffect, useCallback } from 'react'
import { categoryTypeApi } from '../lib/category-type-api'
import {
    CategoryTypeListResponse,
    CategoryTypeFilters,
} from '../types/category-type.types'
import { AsyncState } from '@/features/shared/types/async-state.types'

export function useCategoryTypes(
    filters: CategoryTypeFilters = {},
    initialPage = 1,
    initialPageSize = 10
) {
    const [page, setPage] = useState(initialPage)
    const [pageSize, setPageSize] = useState(initialPageSize)
    const [state, setState] = useState<AsyncState<CategoryTypeListResponse>>({
        status: 'idle',
        data: undefined,
        error: '',
    })

    const filtersKey = JSON.stringify(filters)

    const fetchCategoryTypes = useCallback(async () => {
        setState({
            status: 'loading',
            data: undefined,
            error: '',
        })

        try {
            const response = await categoryTypeApi.getCategoryTypes(
                JSON.parse(filtersKey),
                page,
                pageSize
            )

            if (response.data) {
                setState({ status: 'success', data: response.data, error: '' })
            } else {
                setState({
                    status: 'error',
                    data: undefined,
                    error: response.error || 'Error al obtener tipos de categoría',
                })
            }
        } catch (error) {
            setState({
                status: 'error',
                data: undefined,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Error al obtener tipos de categoría',
            })
        }
    }, [filtersKey, page, pageSize])

    useEffect(() => {
        fetchCategoryTypes()
    }, [fetchCategoryTypes])

    return {
        ...state,
        page,
        pageSize,
        setPage,
        setPageSize,
        refetch: fetchCategoryTypes,
    }
}
