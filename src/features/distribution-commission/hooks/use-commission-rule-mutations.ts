import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import {
	CommissionRule,
	CreateCommissionRuleInput,
	UpdateCommissionRuleInput,
	AssignNewBusinessesResponse,
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
	toggleActive: (
		ruleId: number,
		active: boolean
	) => Promise<{ success: boolean; error?: string }>
	assignNewBusinesses: (ruleId: number) => Promise<boolean>
	isCreating: boolean
	isUpdating: boolean
	isToggling: boolean
	isAssigning: boolean
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
	const [assignState, setAssignState] = useState<
		AsyncState<AssignNewBusinessesResponse>
	>({
		status: 'idle',
		data: undefined,
		error: '',
	})
	const [error, setError] = useState<string>('')

	const reset = () => {
		setCreateState({ status: 'idle', data: undefined, error: '' })
		setUpdateState({ status: 'idle', data: undefined, error: '' })
		setToggleState({ status: 'idle', data: undefined, error: '' })
		setAssignState({ status: 'idle', data: undefined, error: '' })
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
		data: Omit<UpdateCommissionRuleInput, 'idProductPercentageCommission'>
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
	): Promise<{ success: boolean; error?: string }> => {
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
			return { success: false, error: response.error }
		}

		setToggleState({
			status: 'success',
			data: response.data,
			error: '',
		})
		router.refresh()
		onSuccess?.()
		return { success: true }
	}

	const assignNewBusinesses = async (ruleId: number): Promise<boolean> => {
		setAssignState({ status: 'loading', data: undefined, error: '' })
		setError('')

		const response = await commissionRuleApi.assignNewBusinessesRule(
			productConfigId,
			ruleId
		)

		if ('error' in response) {
			setAssignState({
				status: 'error',
				data: undefined,
				error: response.error,
			})
			setError(response.error)
			return false
		}

		setAssignState({
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
		assignNewBusinesses,
		isCreating: createState.status === 'loading',
		isUpdating: updateState.status === 'loading',
		isToggling: toggleState.status === 'loading',
		isAssigning: assignState.status === 'loading',
		error,
		reset,
	}
}
