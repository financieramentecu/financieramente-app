'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { BusinessEntity } from '../types/business-entity.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

type UseFundFirstPaymentReturn = {
	state: AsyncState<BusinessEntity>
	fundFirstPayment: (fundedDate: string) => Promise<ApiResponse<BusinessEntity>>
}

const IDLE: AsyncState<BusinessEntity> = {
	status: 'idle',
	data: undefined,
	error: '',
}

export function useFundFirstPayment(businessId: number): UseFundFirstPaymentReturn {
	const [state, setState] = useState<AsyncState<BusinessEntity>>(IDLE)

	async function fundFirstPayment(
		fundedDate: string
	): Promise<ApiResponse<BusinessEntity>> {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const res = await fetch(`/api/negocios/${businessId}/fondear-aportes`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fundedInstallmentIndexes: [1],
					fundedDate,
				}),
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

	return { state, fundFirstPayment }
}
