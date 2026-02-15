import { useState, useCallback, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import {
	CommissionRule,
	CommissionRuleFilters,
} from '../types/commission-rule.types'
import { commissionRuleApi } from '../lib/commission-rule-api'
import { useDebounce } from '@/features/admin/users/hooks/use-debounce'

interface Pagination {
	page: number
	pageSize: number
	total: number
	totalPages: number
}

interface UseCommissionRulesFilters extends CommissionRuleFilters {
	page: number
	pageSize: number
}

interface UseCommissionRulesReturn {
	data: CommissionRule[]
	pagination?: Pagination
	isLoading: boolean
	isError: boolean
	error: string
	filters: UseCommissionRulesFilters
	setSearch: (value: string) => void
	setActive: (value: string | undefined) => void
	setPage: (page: number) => void
	reload: () => void
}

export function useCommissionRules(
	productConfigId: number
): UseCommissionRulesReturn {
	// Internal State
	const [filters, setFilters] = useState<UseCommissionRulesFilters>({
		page: 1,
		pageSize: 10,
		search: '',
		active: undefined,
	})

	const [state, setState] = useState<
		AsyncState<{ rules: CommissionRule[]; pagination: Pagination }>
	>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	// Debounce search
	const debouncedSearch = useDebounce(filters.search || '', 500)

	const fetchRules = useCallback(async () => {
		if (!productConfigId) return

		setState((prev) => ({
			...prev,
			status: 'loading',
			data: undefined,
			error: '',
		}))
		try {
			const response = await commissionRuleApi.getCommissionRules(
				productConfigId,
				{
					page: filters.page,
					pageSize: filters.pageSize,
					active: filters.active,
					search: debouncedSearch,
				}
			)

			// Check for error property safely, handling backend returning error: null on success
			if ('error' in response) {
				throw new Error(response.error)
			}

			// Success
			if (response.data) {
				setState({
					status: 'success',
					data: response.data,
					error: '',
				})
			} else {
				// Fallback generic error if no data and no error message
				throw new Error('No se encontraron reglas de comisión')
			}
		} catch (error) {
			console.error('Error loading commission rules:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al cargar reglas de comisión',
			})
		}
	}, [
		productConfigId,
		debouncedSearch,
		filters.active,
		filters.page,
		filters.pageSize,
	])

	// Fetch when dependencies change
	useEffect(() => {
		fetchRules()
	}, [fetchRules])

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
		data: state.data?.rules || [],
		pagination: state.data?.pagination,
		isLoading: state.status === 'loading',
		isError: state.status === 'error',
		error: state.error || '',
		filters,
		setSearch,
		setActive,
		setPage,
		reload: fetchRules,
	}
}
