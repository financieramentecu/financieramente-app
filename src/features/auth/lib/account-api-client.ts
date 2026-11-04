import type { ApiResponse } from '@/features/shared/types/api-response.types'

export type AccountEndpoint = 'activate' | 'reset-password' | 'forgot-password'

export const NETWORK_ERROR_MESSAGE =
	'No se pudo completar la solicitud. Inténtalo de nuevo.'

export type AccountApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; message: string }

async function parse<T>(response: Response): Promise<AccountApiResult<T>> {
	let body: ApiResponse<T> | null = null
	try {
		body = (await response.json()) as ApiResponse<T>
	} catch {
		body = null
	}

	if (response.ok && body && body.data !== null) {
		return { ok: true, data: body.data }
	}
	const message =
		body && 'error' in body && typeof body.error === 'string' && body.error
			? body.error
			: NETWORK_ERROR_MESSAGE
	return { ok: false, message }
}

/** POST JSON to a public account endpoint. Never throws. */
export async function postAccountJson<T>(
	endpoint: AccountEndpoint,
	payload: unknown
): Promise<AccountApiResult<T>> {
	try {
		const response = await fetch(`/api/account/${endpoint}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		})
		return await parse<T>(response)
	} catch {
		return { ok: false, message: NETWORK_ERROR_MESSAGE }
	}
}
