import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { productConfigurationApi } from '@/features/product-configuration/lib/product-configuration-api'
import { normalizeProductConfigurationCodeParam } from '@/features/product-configuration/lib/product-configuration-code-route'

export interface ResolvedConfigByCode {
	readonly id: number
	readonly code: string
}

/**
 * Resolves numeric id and canonical code for product configuration routes keyed by URL code segment.
 */
export function useProductConfigurationByCode(
	code: string
): AsyncState<ResolvedConfigByCode> {
	const [state, setState] = useState<AsyncState<ResolvedConfigByCode>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		const trimmed = normalizeProductConfigurationCodeParam(code)
		if (!trimmed) {
			setState({
				status: 'error',
				data: undefined,
				error: 'Código de configuración inválido',
			})
			return
		}

		let cancelled = false
		setState({
			status: 'loading',
			data: undefined,
			error: '',
		})

		void (async () => {
			const res = await productConfigurationApi.getProductConfigurationByCode(trimmed)
			if (cancelled) return
			if (res.data) {
				setState({
					status: 'success',
					data: { id: res.data.id, code: res.data.code },
					error: '',
				})
			} else {
				setState({
					status: 'error',
					data: undefined,
					error: res.error ?? 'Configuración no encontrada',
				})
			}
		})()

		return () => {
			cancelled = true
		}
	}, [code])

	return state
}
