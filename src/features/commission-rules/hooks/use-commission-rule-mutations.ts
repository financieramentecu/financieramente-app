import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import {
	CommissionRule,
	CreateCommissionRuleInput,
	UpdateCommissionRuleInput,
} from '../types/commission-rule.types'
import { commissionRuleApi } from '../lib/commission-rule-api'

interface UseCommissionRuleMutationsReturn {
	create: (
		data: Omit<CreateCommissionRuleInput, 'idProductConfiguration'>
	) => Promise<boolean>
	update: (
		ruleId: number,
		data: Omit<UpdateCommissionRuleInput, 'idProductPercentageCommission'>
	) => Promise<boolean>
	toggleActive: (ruleId: number, active: boolean) => Promise<boolean>
	isCreating: boolean
	isUpdating: boolean
	isToggling: boolean
	error: string
	reset: () => void
}

export function useCommissionRuleMutations(
	productConfigId: number,
	onSuccess?: () => void
): UseCommissionRuleMutationsReturn {
	const router = useRouter()
	const [createState, setCreateState] = useState<AsyncState<CommissionRule>>({
		status: 'idle',
		data: undefined,
		error: '',
	})
	const [updateState, setUpdateState] = useState<AsyncState<CommissionRule>>({
		status: 'idle',
		data: undefined,
		error: '',
	})
	const [toggleState, setToggleState] = useState<AsyncState<CommissionRule>>({
		status: 'idle',
		data: undefined,
		error: '',
	})
	const [error, setError] = useState<string>('')

	const reset = () => {
		setCreateState({ status: 'idle', data: undefined, error: '' })
		setUpdateState({ status: 'idle', data: undefined, error: '' })
		setToggleState({ status: 'idle', data: undefined, error: '' })
		setError('')
	}

	const create = async (
		data: Omit<CreateCommissionRuleInput, 'idProductConfiguration'>
	): Promise<boolean> => {
		setCreateState({ status: 'loading', data: undefined, error: '' })
		setError('')

		const response = await commissionRuleApi.createCommissionRule(
			productConfigId,
			data
		)

		if ('error' in response) {
			setCreateState({
				status: 'error',
				data: undefined,
				error: response.error,
			})
			setError(response.error)
			return false
		}

		setCreateState({
			status: 'success',
			data: response.data,
			error: '',
		})
		router.refresh()
		onSuccess?.()
		return true
	}

	const update = async (
		ruleId: number,
		data: Omit<
			UpdateCommissionRuleInput,
			'idProductPercentageCommission'
		>
	): Promise<boolean> => {
		setUpdateState({ status: 'loading', data: undefined, error: '' })
		setError('')

		const response = await commissionRuleApi.updateCommissionRule(
			productConfigId,
			ruleId,
			data
		)

		if ('error' in response) {
			setUpdateState({
				status: 'error',
				data: undefined,
				error: response.error,
			})
			setError(response.error)
			return false
		}

		setUpdateState({
			status: 'success',
			data: response.data,
			error: '',
		})
		router.refresh()
		onSuccess?.()
		return true
	}

	const toggleActive = async (
		ruleId: number,
		active: boolean
	): Promise<boolean> => {
		setToggleState({ status: 'loading', data: undefined, error: '' })
		setError('')

		const response = await commissionRuleApi.toggleActive(
			productConfigId,
			ruleId,
			active
		)

		if ('error' in response) {
			setToggleState({
				status: 'error',
				data: undefined,
				error: response.error,
			})
			setError(response.error)
			return false
		}

		setToggleState({
			status: 'success',
			data: response.data,
			error: '',
		})
		router.refresh()
		onSuccess?.()
		return true
	}

	return {
		create,
		update,
		toggleActive,
		isCreating: createState.status === 'loading',
		isUpdating: updateState.status === 'loading',
		isToggling: toggleState.status === 'loading',
		error,
		reset,
	}
}
