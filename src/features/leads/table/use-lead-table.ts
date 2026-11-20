'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import {
	DEFAULT_LEAD_TABLE_QUERY,
	parseLeadTableQuery,
	toLeadTableSearchParams,
	type LeadTableQuery,
} from '@/features/leads/table/lead-table-query.schema'
import { fetchLeadTable } from '@/features/leads/table/lead-table-api'
import type { LeadTablePage } from '@/features/leads/table/lead-table.types'

/** Keys of `?…` owned by the CRM page itself, kept when the table rewrites the URL. */
const PAGE_KEYS = ['tab', 'lead'] as const

function initialQuery(params: URLSearchParams): LeadTableQuery {
	const parsed = parseLeadTableQuery(params)
	return parsed.ok ? parsed.query : DEFAULT_LEAD_TABLE_QUERY
}

/**
 * Lead table state: the query lives in the URL (shareable, back button),
 * results in an `AsyncState`. Any filter change goes back to page 1.
 */
export function useLeadTable() {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const [query, setQueryState] = React.useState<LeadTableQuery>(() => initialQuery(new URLSearchParams(searchParams.toString())))
	const [state, setState] = React.useState<AsyncState<LeadTablePage>>({ status: 'loading', data: undefined, error: '' })
	const [reloadKey, setReloadKey] = React.useState(0)

	React.useEffect(() => {
		let cancelled = false
		setState((previous) => (previous.status === 'success' ? previous : { status: 'loading', data: undefined, error: '' }))
		fetchLeadTable(query)
			.then((data) => !cancelled && setState({ status: 'success', data, error: '' }))
			.catch((cause: Error) => !cancelled && setState({ status: 'error', data: undefined, error: cause.message }))
		return () => {
			cancelled = true
		}
	}, [query, reloadKey])

	function commit(next: LeadTableQuery) {
		setQueryState(next)
		const params = toLeadTableSearchParams(next)
		for (const key of PAGE_KEYS) {
			const value = searchParams.get(key)
			if (value) params.set(key, value)
		}
		router.replace(`${pathname}?${params.toString()}`, { scroll: false })
	}

	function updateFilters(patch: Partial<Omit<LeadTableQuery, 'page'>>) {
		commit({ ...query, ...patch, page: 1 })
	}

	function goToPage(page: number) {
		commit({ ...query, page })
	}

	function toggleSort(sort: LeadTableQuery['sort']) {
		const dir = query.sort === sort && query.dir === 'desc' ? 'asc' : 'desc'
		commit({ ...query, sort, dir, page: 1 })
	}

	function replaceQuery(next: Omit<LeadTableQuery, 'page' | 'pageSize'>) {
		commit({ ...next, page: 1, pageSize: query.pageSize })
	}

	return {
		query,
		state,
		updateFilters,
		goToPage,
		toggleSort,
		replaceQuery,
		reload: () => setReloadKey((key) => key + 1),
	}
}
