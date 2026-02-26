'use client'

import { useState, useEffect } from 'react'
import { categoryApi } from '../lib/category-api'
import type { Category, CategoryFilters } from '@/features/categories/types/category.types'

export function useCategories(filters?: CategoryFilters) {
	const [categories, setCategories] = useState<Category[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		loadCategories()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters?.search, filters?.typeCategory, filters?.status])

	const loadCategories = async () => {
		try {
			setIsLoading(true)
			setError(null)
			const data = await categoryApi.getCategories(filters)
			setCategories(data)
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Error desconocido')
			setError(error)
			console.error('Error loading categories:', error)
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
