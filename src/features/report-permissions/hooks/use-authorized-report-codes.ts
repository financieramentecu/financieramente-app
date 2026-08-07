'use client'

import { useState, useEffect } from 'react'
import { fetchMyAuthorizedReports } from '@/features/report-permissions/lib/report-permissions-api'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import type { AsyncState } from '@/features/shared/types/async-state.types'

/**
 * Loads authorized report codes for the current session (nav gating).
 */
export function useAuthorizedReportCodes() {
	const { session } = useAuthSession()
	const [state, setState] = useState<AsyncState<readonly string[]>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		if (!session?.user) {
			setState({ status: 'idle', data: undefined, error: '' })
			return
		}

		let cancelled = false

		async function load() {
			setState({ status: 'loading', data: undefined, error: '' })
			try {
				const result = await fetchMyAuthorizedReports()
				if (!cancelled) {
					setState({ status: 'success', data: result.codes, error: '' })
				}
			} catch (err) {
				if (!cancelled) {
					setState({
						status: 'error',
						data: undefined,
						error:
							err instanceof Error
								? err.message
								: 'Error al cargar reportes autorizados',
					})
				}
			}
		}

		void load()
		return () => {
			cancelled = true
		}
	}, [session?.user])

	return {
		codes: state.status === 'success' ? state.data : ([] as readonly string[]),
		state,
	}
}
