'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { PaymentInstallmentDto } from '../types/business-api.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

type UseAporteTransitionsReturn = {
	state: AsyncState<PaymentInstallmentDto>
	markCartera: (businessId: number, index: number) => Promise<ApiResponse<PaymentInstallmentDto>>
	unmarkCartera: (businessId: number, index: number) => Promise<ApiResponse<PaymentInstallmentDto>>
	markPagoAnticipado: (businessId: number, index: number) => Promise<ApiResponse<PaymentInstallmentDto>>
}

const IDLE: AsyncState<PaymentInstallmentDto> = {
	status: 'idle',
	data: undefined,
	error: '',
}

export function useAporteTransitions(): UseAporteTransitionsReturn {
	const [state, setState] =
		useState<AsyncState<PaymentInstallmentDto>>(IDLE)

	async function callEndpoint(url: string, method: string): Promise<ApiResponse<PaymentInstallmentDto>> {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const res = await fetch(url, { method })
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

	function markCartera(businessId: number, index: number) {
		return callEndpoint(`/api/negocios/${businessId}/aportes/${index}/cartera`, 'PATCH')
	}

	function unmarkCartera(businessId: number, index: number) {
		return callEndpoint(`/api/negocios/${businessId}/aportes/${index}/cartera`, 'DELETE')
	}

	function markPagoAnticipado(businessId: number, index: number) {
		return callEndpoint(`/api/negocios/${businessId}/aportes/${index}/pago-anticipado`, 'POST')
	}

	return { state, markCartera, unmarkCartera, markPagoAnticipado }
}
