import { useState, useCallback, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ProductConfiguration } from '../types/product-configuration.types'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'

interface Pagination {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface ProductConfigurationsData {
	configurations: ProductConfiguration[]
	pagination: Pagination
}

interface UseProductConfigurationsFilters {
	search?: string
	active?: string
	page: number
	pageSize: number
}

interface UseProductConfigurationsReturn {
	data: ProductConfiguration[]
	pagination?: Pagination
	isLoading: boolean
	isError: boolean
	error: string
	filters: UseProductConfigurationsFilters
	setSearch: (value: string) => void
	setActive: (value: string | undefined) => void
	setPage: (page: number) => void
	reload: () => void
}

export function useProductConfigurations(): UseProductConfigurationsReturn {
	// Internal State
	const [filters, setFilters] = useState<UseProductConfigurationsFilters>({
		page: 1,
		pageSize: 10,
		search: '',
		active: undefined,
	})

	const [state, setState] = useState<AsyncState<ProductConfigurationsData>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	// Debounce search
	const debouncedSearch = useDebounce(filters.search || '', 500)

	const fetchConfigurations = useCallback(async () => {
		setState((prev) => ({
			...prev,
			status: 'loading',
			data: undefined,
			error: '',
		}))
		try {
			const params = new URLSearchParams()
			if (debouncedSearch) params.append('search', debouncedSearch)
			if (filters.active && filters.active !== 'all')
				params.append('active', filters.active)
			params.append('page', filters.page.toString())
			params.append('pageSize', filters.pageSize.toString())

			const response = await fetch(
				`/api/product-configurations?${params.toString()}`
			)
			const result = await response.json()

			if (result.error) {
				throw new Error(result.error)
			}

			if (result.data) {
				setState({
					status: 'success',
					data: result.data,
					error: '',
				})
			} else {
				setState({
					status: 'success',
					data: {
						configurations: [],
						pagination: {
							page: filters.page,
							pageSize: filters.pageSize,
							total: 0,
							totalPages: 0,
						},
					},
					error: '',
				})
			}
		} catch (error) {
			console.error('Error loading configurations:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al cargar configuraciones',
			})
		}
	}, [debouncedSearch, filters.active, filters.page, filters.pageSize])

	// Fetch when dependencies change
	useEffect(() => {
		fetchConfigurations()
	}, [fetchConfigurations])

	// Handlers
	const setSearch = useCallback((value: string) => {
		setFilters((prev) => ({ ...prev, search: value, page: 1 }))
	}, [])

	const setActive = useCallback((value: string | undefined) => {
		setFilters((prev) => ({ ...prev, active: value, page: 1 }))
	}, [])

	const setPage = useCallback((page: number) => {
		setFilters((prev) => ({ ...prev, page }))
	}, [])

	return {
		data: state.data?.configurations || [],
		pagination: state.data?.pagination,
		isLoading: state.status === 'loading',
		isError: state.status === 'error',
		error: state.error || '',
		filters,
		setSearch,
		setActive,
		setPage,
		reload: fetchConfigurations,
	}
}
