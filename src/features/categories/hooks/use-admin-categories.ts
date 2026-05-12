'use client'

import { useState, useEffect } from 'react'
import { categoryApi } from '../lib/category-api'
import type { Category, CategoryFilters } from '../types/category.types'

export function useAdminCategories(filters?: CategoryFilters) {
	const [categories, setCategories] = useState<Category[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		loadCategories()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters?.search, filters?.status])

	const loadCategories = async () => {
		try {
			setIsLoading(true)
			setError(null)
			const response = await categoryApi.getCategories({
				...filters,
				pageSize: 1000,
			})

			if ('error' in response && response.error) {
				setError(new Error(response.error))
				return
			}

			setCategories(response.data?.categories ?? [])
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Error desconocido')
			setError(error)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		categories,
		isLoading,
		error,
		refreshCategories: loadCategories,
	}
}
