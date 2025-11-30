'use client'

import { useState, useEffect } from 'react'
import { productApi } from '../lib/product-api'
import type { Product, ProductFilters } from '../types/product.types'

export function useProducts(filters?: ProductFilters) {
	const [products, setProducts] = useState<Product[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		loadProducts()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters?.search, filters?.companyId])

	const loadProducts = async () => {
		try {
			setIsLoading(true)
			setError(null)
			const data = await productApi.getProducts(filters)
			setProducts(data)
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Error desconocido')
			setError(error)
			console.error('Error loading products:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		products,
		isLoading,
		error,
		refreshProducts: loadProducts,
	}
}
