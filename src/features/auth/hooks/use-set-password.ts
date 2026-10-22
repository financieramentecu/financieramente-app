'use client'

import { useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { postAccountJson } from '../lib/account-api-client'

export type SetPasswordState = AsyncState<{ ok: true }>

/** Submits token + new password to the activate or reset endpoint. */
export function useSetPassword(endpoint: 'activate' | 'reset-password') {
	const [state, setState] = useState<SetPasswordState>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	async function submit(token: string, password: string) {
		setState({ status: 'loading', data: undefined, error: '' })
		const result = await postAccountJson<{ ok: true }>(endpoint, {
			token,
			password,
		})
		setState(
			result.ok
				? { status: 'success', data: result.data, error: '' }
				: { status: 'error', data: undefined, error: result.message }
		)
	}

	return { state, submit }
}
