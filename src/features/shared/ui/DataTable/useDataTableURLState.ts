'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
	ColumnFiltersState,
	PaginationState,
	SortingState,
} from '@tanstack/react-table'

/**
 * Hook para sincronizar el estado de una DataTable con los Query Params de la URL.
 * Soporta paginación, ordenamiento y filtros.
 */
export function useDataTableURLState(prefix?: string) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	// Helpers para generar keys con prefijo opcional (útil para múltiples tablas en una página)
	const getParamKey = useCallback(
		(key: string) => (prefix ? `${prefix}_${key}` : key),
		[prefix]
	)

	// --- Lectura de Estado desde URL ---

	const pagination = useMemo<PaginationState>(() => {
		const page = searchParams.get(getParamKey('page'))
		const size = searchParams.get(getParamKey('limit'))

		return {
			pageIndex: page ? Number(page) - 1 : 0,
			pageSize: size ? Number(size) : 10,
		}
	}, [searchParams, getParamKey])

	const sorting = useMemo<SortingState>(() => {
		const sort = searchParams.get(getParamKey('sort'))
		if (!sort) return []

		const [id, desc] = sort.split('.')
		return [{ id, desc: desc === 'desc' }]
	}, [searchParams, getParamKey])

	const columnFilters = useMemo<ColumnFiltersState>(() => {
		const filters: ColumnFiltersState = []

		searchParams.forEach((value, key) => {
			const searchPrefix = getParamKey('filter_')
			if (key.startsWith(searchPrefix)) {
				const id = key.replace(searchPrefix, '')
				filters.push({ id, value })
			}
		})

		return filters
	}, [searchParams, getParamKey])

	// --- Actualización de URL ---

	const setURLState = useCallback(
		(updates: {
			pagination?: PaginationState
			sorting?: SortingState
			filters?: ColumnFiltersState
		}) => {
			const params = new URLSearchParams(searchParams.toString())

			if (updates.pagination) {
				params.set(getParamKey('page'), (updates.pagination.pageIndex + 1).toString())
				params.set(getParamKey('limit'), updates.pagination.pageSize.toString())
			}

			if (updates.sorting !== undefined) {
				if (updates.sorting.length > 0) {
					const { id, desc } = updates.sorting[0]
					params.set(getParamKey('sort'), `${id}.${desc ? 'desc' : 'asc'}`)
				} else {
					params.delete(getParamKey('sort'))
				}
			}

			if (updates.filters !== undefined) {
				// Limpiar filtros anteriores del mismo prefijo
				const searchPrefix = getParamKey('filter_')
				Array.from(params.keys()).forEach((key) => {
					if (key.startsWith(searchPrefix)) params.delete(key)
				})

				// Agregar nuevos
				updates.filters.forEach((filter) => {
					params.set(`${searchPrefix}${filter.id}`, filter.value as string)
				})
			}

			router.push(`${pathname}?${params.toString()}`, { scroll: false })
		},
		[router, pathname, searchParams, getParamKey]
	)

	return {
		pagination,
		sorting,
		columnFilters,
		setURLState,
	}
}
