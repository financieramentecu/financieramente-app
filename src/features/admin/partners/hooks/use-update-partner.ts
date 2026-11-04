'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { failure, IDLE, LOADING, success } from '../lib/async-state'
import { partnerApi } from '../lib/partner-api'
import type { PartnerDto, UpdatePartnerInput } from '../types/partner.types'

export type UpdatePartnerOutcome =
	| { ok: true; data: PartnerDto }
	| { ok: false; error: string }

export function useUpdatePartner() {
	const [state, setState] = useState<AsyncState<PartnerDto>>(IDLE)

	async function submit(
		id: number,
		input: UpdatePartnerInput
	): Promise<UpdatePartnerOutcome> {
		setState(LOADING)
		try {
			const data = await partnerApi.update(id, input)
			setState(success(data))
			return { ok: true, data }
		} catch (error) {
			const next = failure(error, 'Error al actualizar el partner')
			setState(next)
			return { ok: false, error: next.error }
		}
	}

	function reset() {
		setState(IDLE)
	}

	return { state, submit, reset }
}
