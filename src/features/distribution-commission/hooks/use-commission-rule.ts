import { useState, useCallback, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { CommissionRule } from '../types/commission-rule.types'
import { commissionRuleApi } from '../lib/commission-rule-api'

interface UseCommissionRuleReturn {
	data: CommissionRule | undefined
	isLoading: boolean
	isError: boolean
	error: string
	reload: () => void
}

export function useCommissionRule(
	productConfigId: number,
	ruleId: number
): UseCommissionRuleReturn {
	const [state, setState] = useState<AsyncState<CommissionRule>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const fetchRule = useCallback(async () => {
		if (!productConfigId || !ruleId) return

		setState((prev) => ({
			...prev,
			status: 'loading',
			data: undefined,
			error: '',
		}))

		try {
			const response = await commissionRuleApi.getCommissionRule(
				productConfigId,
				ruleId
			)

			if ('error' in response) {
				throw new Error(response.error)
			}

			if (response.data) {
				setState({
					status: 'success',
					data: response.data,
					error: '',
				})
			} else {
				throw new Error('No se pudo cargar la regla')
			}
		} catch (error) {
			console.error('Error loading commission rule:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al cargar regla de comisión',
			})
		}
	}, [productConfigId, ruleId])

	useEffect(() => {
		fetchRule()
	}, [fetchRule])

	return {
		data: state.data,
		isLoading: state.status === 'loading',
		isError: state.status === 'error',
		error: state.error || '',
		reload: fetchRule,
	}
}
