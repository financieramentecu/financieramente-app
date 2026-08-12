'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { BusinessEntity, BusinessNovedadStatus } from '../types/business-entity.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

type UseManageNovedadReturn = {
	state: AsyncState<BusinessEntity>
	updateStatus: (novedadStatus: BusinessNovedadStatus) => Promise<ApiResponse<BusinessEntity>>
}

const IDLE: AsyncState<BusinessEntity> = {
	status: 'idle',
	data: undefined,
	error: '',
}

/**
 * Backoffice hook for PATCH /api/negocios/[id]/manage-novedad — moves a
 * business's novedad status between the 4 manual states
 * (SOMETIDA_DEVOLUCION, DECLINADA, PENDIENTE, CANCELADA). Mirrors
 * `useMarkNovedad` for the self-service MARK/UNMARK flow.
 */
export function useManageNovedad(businessId: number): UseManageNovedadReturn {
	const [state, setState] = useState<AsyncState<BusinessEntity>>(IDLE)

	async function updateStatus(
		novedadStatus: BusinessNovedadStatus
	): Promise<ApiResponse<BusinessEntity>> {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const res = await fetch(`/api/negocios/${businessId}/manage-novedad`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ novedadStatus }),
			})
			const json = (await res.json()) as ApiResponse<BusinessEntity>

			if (!res.ok || !json.data) {
				const errMsg = 'error' in json ? json.error : 'Error desconocido'
				setState({ status: 'error', data: undefined, error: errMsg })
				return json
			}

			setState({ status: 'success', data: json.data, error: '' })
			return json
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Error de red'
			setState({ status: 'error', data: undefined, error: msg })
			return { data: null, error: msg }
		}
	}

	return { state, updateStatus }
}
