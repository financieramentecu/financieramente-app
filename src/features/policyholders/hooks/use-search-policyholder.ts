'use client'

import { useEffect, useState } from 'react'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { AsyncState } from '@/features/shared/types/async-state.types'
import type { PolicyholderSearchResult } from '@/features/policyholders/types/policyholder.types'

const idleState: AsyncState<PolicyholderSearchResult[]> = {
	status: 'idle',
	data: undefined,
	error: '',
}

export function useSearchPolicyholder() {
	const [query, setQuery] = useState('')
	const [state, setState] =
		useState<AsyncState<PolicyholderSearchResult[]>>(idleState)

	useEffect(() => {
		const trimmed = query.trim()
		if (trimmed.length < 3) {
			setState(idleState)
			return
		}

		const controller = new AbortController()
		const timer = setTimeout(async () => {
			setState({ status: 'loading', data: undefined, error: '' })
			try {
				const response = await fetch(
					`/api/policyholders/search?query=${encodeURIComponent(trimmed)}&limit=10`,
					{ signal: controller.signal }
				)
				if (!response.ok) {
					throw new Error('Error al buscar tomadores')
				}
				const apiResponse: ApiResponse<PolicyholderSearchResult[]> =
					await response.json()
				if ('error' in apiResponse) {
					setState({
						status: 'error',
						data: undefined,
						error: apiResponse.error || 'Error al buscar tomadores',
					})
					return
				}
				setState({
					status: 'success',
					data: apiResponse.data ?? [],
					error: '',
				})
			} catch (error) {
				if (controller.signal.aborted) return
				setState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al buscar tomadores',
				})
			}
		}, 400)

		return () => {
			controller.abort()
			clearTimeout(timer)
		}
	}, [query])

	const results = state.status === 'success' ? state.data : []

	return { query, setQuery, results, state }
}
