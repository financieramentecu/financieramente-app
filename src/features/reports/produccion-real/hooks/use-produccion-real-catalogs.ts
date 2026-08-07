'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { DashboardCatalogItem } from '@/app/api/production-dashboard/catalogs/route'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'

export interface ProduccionRealCatalogsData {
	readonly companies: readonly DashboardCatalogItem[]
}

/**
 * Loads company catalog for Producción Real filters (includes SKANDIA).
 * Reuses production-dashboard catalogs endpoint.
 */
export function useProduccionRealCatalogs(): AsyncState<ProduccionRealCatalogsData> {
	const [state, setState] = useState<AsyncState<ProduccionRealCatalogsData>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		let cancelled = false

		async function load() {
			try {
				const response = await apiClient.get<
					ApiResponse<{
						companies: DashboardCatalogItem[]
					}>
				>('/production-dashboard/catalogs')

				if (cancelled) return

				if (response.data?.companies) {
					setState({
						status: 'success',
						data: { companies: response.data.companies },
						error: '',
					})
					return
				}

				setState({
					status: 'error',
					data: undefined,
					error: PRODUCCION_REAL_UI.ERROR_CATALOGS,
				})
			} catch {
				if (!cancelled) {
					setState({
						status: 'error',
						data: undefined,
						error: PRODUCCION_REAL_UI.ERROR_CATALOGS,
					})
				}
			}
		}

		void load()
		return () => {
			cancelled = true
		}
	}, [])

	return state
}
