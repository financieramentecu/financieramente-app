'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { PaymentInstallmentDto } from '../types/business-api.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

type UseAporteTransitionsReturn = {
	state: AsyncState<PaymentInstallmentDto>
	markCartera: (businessId: number, index: number) => Promise<ApiResponse<PaymentInstallmentDto>>
	markPagoAnticipado: (businessId: number, index: number) => Promise<ApiResponse<PaymentInstallmentDto>>
	markCarteraPagado: (businessId: number, index: number, paymentDate: string) => Promise<ApiResponse<PaymentInstallmentDto>>
}

const IDLE: AsyncState<PaymentInstallmentDto> = {
	status: 'idle',
	data: undefined,
	error: '',
}

export function useAporteTransitions(): UseAporteTransitionsReturn {
	const [state, setState] =
		useState<AsyncState<PaymentInstallmentDto>>(IDLE)

	async function callEndpoint(url: string, method: string, body?: unknown): Promise<ApiResponse<PaymentInstallmentDto>> {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const fetchOptions: RequestInit = { method }
			if (body !== undefined) {
				fetchOptions.headers = { 'Content-Type': 'application/json' }
				fetchOptions.body = JSON.stringify(body)
			}
			const res = await fetch(url, fetchOptions)
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

	function markPagoAnticipado(businessId: number, index: number) {
		return callEndpoint(`/api/negocios/${businessId}/aportes/${index}/pago-anticipado`, 'POST')
	}

	function markCarteraPagado(businessId: number, index: number, paymentDate: string) {
		return callEndpoint(
			`/api/negocios/${businessId}/aportes/${index}/cartera-pagado`,
			'POST',
			{ paymentDate }
		)
	}

	return { state, markCartera, markPagoAnticipado, markCarteraPagado }
}
