'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { PaymentInstallmentDto } from '../types/business-api.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

type UseUpdateFundedDateReturn = {
	state: AsyncState<PaymentInstallmentDto>
	updateFundedDate: (dateAnchored: string) => Promise<ApiResponse<PaymentInstallmentDto>>
}

const IDLE: AsyncState<PaymentInstallmentDto> = {
	status: 'idle',
	data: undefined,
	error: '',
}

export function useUpdateFundedDate(
	businessId: number,
	index: number
): UseUpdateFundedDateReturn {
	const [state, setState] = useState<AsyncState<PaymentInstallmentDto>>(IDLE)

	async function updateFundedDate(
		dateAnchored: string
	): Promise<ApiResponse<PaymentInstallmentDto>> {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const res = await fetch(
				`/api/negocios/${businessId}/aportes/${index}/date-anchored`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ dateAnchored }),
				}
			)
			const json = (await res.json()) as ApiResponse<PaymentInstallmentDto>

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

	return { state, updateFundedDate }
}
