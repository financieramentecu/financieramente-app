'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { failure, IDLE, LOADING, success } from '../lib/async-state'
import { partnerApi } from '../lib/partner-api'
import type {
	CreatePartnerInput,
	PartnerWithEmailResult,
} from '../types/partner.types'

export type CreatePartnerOutcome =
	| { ok: true; data: PartnerWithEmailResult }
	| { ok: false; error: string }

export function useCreatePartner() {
	const [state, setState] = useState<AsyncState<PartnerWithEmailResult>>(IDLE)

	async function submit(
		input: CreatePartnerInput
	): Promise<CreatePartnerOutcome> {
		setState(LOADING)
		try {
			const data = await partnerApi.create(input)
			setState(success(data))
			return { ok: true, data }
		} catch (error) {
			const next = failure(error, 'Error al crear el partner')
			setState(next)
			return { ok: false, error: next.error }
		}
	}

	function reset() {
		setState(IDLE)
	}

	return { state, submit, reset }
}
