'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCommissionDiscounts } from '@/features/commission-discounts/lib/commission-discount-api'
import type { CommissionDiscount } from '@/features/commission-discounts/types/commission-discount.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'

export function useCommissionDiscounts() {
	const [state, setState] = useState<AsyncState<CommissionDiscount[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetch = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const discounts = await getCommissionDiscounts()
			setState({ status: 'success', data: discounts, error: '' })
		} catch (err) {
			setState({
				status: 'error',
				data: undefined,
				error: err instanceof Error ? err.message : 'Error al cargar descuentos',
			})
		}
	}, [])

	useEffect(() => {
		fetch()
	}, [fetch])

	return { state, refresh: fetch }
}
