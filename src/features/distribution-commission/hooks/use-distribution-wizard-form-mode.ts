import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { CommissionRule } from '../types/commission-rule.types'
import { commissionRuleApi } from '../lib/commission-rule-api'
import { findActiveRulePendingDistribution } from '../lib/distribution-wizard-form-mode'

export interface DistributionWizardFormModeResult {
	readonly mode: 'create' | 'edit'
	readonly initialRule: CommissionRule | undefined
}

/**
 * Resolves whether the "crear distribución" form should create a new PPC or edit the
 * auto-created shell (active rule with no category lines yet).
 */
export function useDistributionWizardFormMode(
	productConfigId: number | undefined
): AsyncState<DistributionWizardFormModeResult> {
	const [state, setState] = useState<
		AsyncState<DistributionWizardFormModeResult>
	>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	useEffect(() => {
		if (productConfigId === undefined || Number.isNaN(productConfigId)) {
			setState({
				status: 'loading',
				data: undefined,
				error: '',
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
			const res = await commissionRuleApi.getCommissionRules(productConfigId, {
				page: 1,
				pageSize: 50,
				active: 'true',
			})
			if (cancelled) return

			if (res.data === null) {
				setState({
					status: 'error',
					data: undefined,
					error: res.error,
				})
				return
			}

			const placeholder = findActiveRulePendingDistribution(res.data.rules)
			setState({
				status: 'success',
				data: {
					mode: placeholder ? 'edit' : 'create',
					initialRule: placeholder,
				},
				error: '',
			})
		})()

		return () => {
			cancelled = true
		}
	}, [productConfigId])

	return state
}
