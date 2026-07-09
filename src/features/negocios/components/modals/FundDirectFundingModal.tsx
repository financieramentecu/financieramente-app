'use client'

import { FundedDatePickerDialog } from './FundedDatePickerDialog'
import type { Business } from '../../types/business.types'

export interface FundDirectFundingModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	business: Business | null
	onConfirm: (fundedDate: string) => void
	isLoading: boolean
	error?: string | null
}

/**
 * Modal de confirmación para fondeo directo de negocios sin anualidades
 * (numAportes = 0). Permite seleccionar la fecha de fondeo antes de
 * confirmar la transición EMITIDO → FONDEADO.
 *
 * No realiza la llamada a la API por sí mismo (SRP): solo emite la fecha
 * seleccionada vía `onConfirm`; el componente padre orquesta la mutación.
 */
export function FundDirectFundingModal({
	open,
	onOpenChange,
	business,
	onConfirm,
	isLoading,
	error,
}: FundDirectFundingModalProps) {
	const subtitle = business
		? `Negocio ${business.contract ?? `#${business.id}`} — ${business.clientName}`
		: undefined

	return (
		<FundedDatePickerDialog
			open={open}
			title="Confirmar Fondeo"
			subtitle={subtitle}
			isLoading={isLoading}
			error={error}
			onConfirm={onConfirm}
			onCancel={() => onOpenChange(false)}
		/>
	)
}
