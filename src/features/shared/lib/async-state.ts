import type { AsyncState } from '@/features/shared/types/async-state.types'

export const IDLE: AsyncState<never> = {
	status: 'idle',
	data: undefined,
	error: '',
}

export const LOADING: AsyncState<never> = {
	status: 'loading',
	data: undefined,
	error: '',
}

export function success<T>(data: T): AsyncState<T> {
	return { status: 'success', data, error: '' }
}

export function failure(error: unknown, fallback: string): AsyncState<never> {
	return {
		status: 'error',
		data: undefined,
		error: error instanceof Error && error.message ? error.message : fallback,
	}
}
