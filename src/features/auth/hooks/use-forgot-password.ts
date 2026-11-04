'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { postAccountJson } from '../lib/account-api-client'

export type ForgotPasswordState = AsyncState<{ ok: true }>

/** Requests a reset link. The server answers identically for any email. */
export function useForgotPassword() {
	const [state, setState] = useState<ForgotPasswordState>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	async function submit(email: string) {
		setState({ status: 'loading', data: undefined, error: '' })
		const result = await postAccountJson<{ ok: true }>('forgot-password', {
			email,
		})
		setState(
			result.ok
				? { status: 'success', data: result.data, error: '' }
				: { status: 'error', data: undefined, error: result.message }
		)
	}

	return { state, submit }
}
