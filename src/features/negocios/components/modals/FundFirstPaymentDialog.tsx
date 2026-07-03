'use client'

import { useFundFirstPayment } from '../../hooks/use-fund-first-payment'
import { FundedDatePickerDialog } from './FundedDatePickerDialog'
import type { BusinessEntity } from '../../types/business-entity.types'

export interface FundFirstPaymentDialogProps {
	open: boolean
	businessId: number
	onSuccess: (business: BusinessEntity) => void
	onCancel: () => void
}

export function FundFirstPaymentDialog({
	open,
	businessId,
	onSuccess,
	onCancel,
}: FundFirstPaymentDialogProps) {
	const { state, fundFirstPayment } = useFundFirstPayment(businessId)

	const handleConfirm = async (date: string) => {
		const result = await fundFirstPayment(date)
		if (result.data) {
			onSuccess(result.data)
		}
	}

	const isLoading = state.status === 'loading'
	const errorMessage = state.status === 'error' ? state.error : null

	return (
		<FundedDatePickerDialog
			open={open}
			title="Fondear primer aporte"
			subtitle="Seleccione la fecha de fondeo para el Aporte 1."
			isLoading={isLoading}
			error={errorMessage}
			onConfirm={(date) => void handleConfirm(date)}
			onCancel={onCancel}
		/>
	)
}
