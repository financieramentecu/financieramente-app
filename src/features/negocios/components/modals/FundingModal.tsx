'use client'

import * as React from 'react'
import { Button } from '@/features/shared/ui/button'
import { Skeleton } from '@/features/shared/ui/skeleton'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/features/shared/ui/dialog'
import type { PaymentInstallmentDto } from '../../types/business-api.types'
import { AporteRow, type AporteAction } from './AporteRow'
import { ConfirmActionDialog } from '@/features/shared/ui/confirm-action-dialog'
import { ConfirmCarteraPagadoDialog } from './ConfirmCarteraPagadoDialog'
import { EditFundedDateModal } from './EditFundedDateModal'
import { FundFirstPaymentDialog } from './FundFirstPaymentDialog'
import { useAporteTransitions } from '../../hooks/use-aporte-transitions'
import { canFundPayments } from '@/features/auth/lib/roles'
import type { BusinessEntity } from '../../types/business-entity.types'

type ConfirmableAction = Exclude<AporteAction, 'UNMARK_CARTERA' | 'FONDEAR'>

const DIALOG_CONFIG: Record<ConfirmableAction, { title: string; description: string; confirmLabel: string }> = {
	MARK_CARTERA: {
		title: 'Marcar como En Cartera',
		description: '¿Confirmar que este aporte se marcará como En Cartera? Se registrará la fecha actual.',
		confirmLabel: 'Marcar Cartera',
	},
	MARK_ANTICIPADO: {
		title: 'Marcar como Pago Anticipado',
		description: '¿Confirmar que el cliente realizó un pago anticipado? Se registrará la fecha actual.',
		confirmLabel: 'Confirmar Pago Anticipado',
	},
}

export interface FundingModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	businessId: number | null
	contractLabel?: string | null
	installments: PaymentInstallmentDto[]
	isLoadingInstallments?: boolean
	periodicidadLabel?: string | null
	plazo?: number | null
	/** Role code of the current user — used to gate action buttons */
	roleCode?: string
	/** Business status: 'EMITIDO' (not funded) or 'FONDEADO' (funded) etc */
	businessStatus?: string
	/** ISO date of business funding; null if not yet funded */
	dateAnchored?: string | null
	/** Callback to refetch installments after funding changes */
	onRefetchInstallments?: () => void
	/** Callback to refetch main business list after funding changes */
	onFundingSuccess?: () => void
}

export function FundingModal({
	open,
	onOpenChange,
	businessId,
	contractLabel,
	installments: initialInstallments,
	isLoadingInstallments = false,
	periodicidadLabel,
	plazo,
	roleCode,
	businessStatus = 'FONDEADO',
	dateAnchored = null,
	onRefetchInstallments,
	onFundingSuccess,
}: FundingModalProps) {
	const [installments, setInstallments] =
		React.useState<PaymentInstallmentDto[]>(initialInstallments)
	const [pendingConfirm, setPendingConfirm] = React.useState<{ action: ConfirmableAction; index: number } | null>(null)
	const [pendingCarteraPagado, setPendingCarteraPagado] = React.useState<{ index: number } | null>(null)
	const [pendingFondearIndex, setPendingFondearIndex] = React.useState<number | null>(null)
	const [loadingIndex, setLoadingIndex] = React.useState<number | null>(null)
	const [editFundedDateIndex, setEditFundedDateIndex] = React.useState<number | null>(null)
	const now = React.useMemo(() => new Date(), [])
	const { markCartera, markPagoAnticipado, markCarteraPagado } = useAporteTransitions()

	React.useEffect(() => {
		setInstallments(initialInstallments)
	}, [initialInstallments])

	const canMutate = canFundPayments(roleCode)

	// Business is considered "not funded" if: status is EMITIDO OR dateAnchored is null.
	// This handles both: (1) initial EMITIDO state, and (2) edge case where status changed to CARTERA
	// but dateAnchored remains null. When not funded, only first payment can have active buttons.
	const isBusinessEmitido = businessStatus === 'EMITIDO' || dateAnchored === null

	const handleTransitionSuccess = (updated: PaymentInstallmentDto) => {
		setInstallments((prev) =>
			prev.map((row) =>
				row.installmentIndex === updated.installmentIndex ? updated : row
			)
		)
	}

	const handleRequestAction = (action: AporteAction, index: number) => {
		if (action === 'UNMARK_CARTERA') {
			setPendingCarteraPagado({ index })
		} else if (action === 'FONDEAR') {
			setPendingFondearIndex(index)
		} else {
			setPendingConfirm({ action, index })
		}
	}

	const handleFundFirstPaymentSuccess = (_updatedBusiness: BusinessEntity) => {
		// After funding first payment, refetch installments and main list to reflect updated state
		setPendingFondearIndex(null)
		onRefetchInstallments?.()
		onFundingSuccess?.()
	}

	const handleConfirmAction = async () => {
		if (!pendingConfirm || businessId === null) return
		const { action, index } = pendingConfirm
		setPendingConfirm(null)
		setLoadingIndex(index)

		const call =
			action === 'MARK_CARTERA' ? markCartera :
			markPagoAnticipado

		const result = await call(businessId, index)
		setLoadingIndex(null)
		if (result.data) handleTransitionSuccess(result.data)
	}

	const handleCarteraPagadoConfirm = async (paymentDate: string) => {
		if (!pendingCarteraPagado || businessId === null) return
		const { index } = pendingCarteraPagado
		setPendingCarteraPagado(null)
		setLoadingIndex(index)

		const result = await markCarteraPagado(businessId, index, paymentDate)
		setLoadingIndex(null)
		if (result.data) {
			handleTransitionSuccess(result.data)
		}
	}

	const trimmedContract = contractLabel?.trim() ?? ''
	const contractSuffix =
		trimmedContract !== ''
			? ` · Contrato ${trimmedContract}`
			: businessId !== null
				? ` · Negocio #${businessId}`
				: ''

	const headerMeta = [
		periodicidadLabel,
		plazo != null ? `${plazo} ${plazo === 1 ? 'año' : 'años'}` : null,
	]
		.filter(Boolean)
		.join(' · ')

	return (
		<>
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						Fondear aportes
						{contractSuffix}
					</DialogTitle>
					{headerMeta && (
						<p className="text-sm text-muted-foreground pt-0.5">{headerMeta}</p>
					)}
				</DialogHeader>

				{isLoadingInstallments ? (
					<div className="space-y-3 py-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : (
					<div className="space-y-4 py-2">
						<ul className="max-h-[50vh] overflow-y-auto space-y-1 pr-1">
							{installments.map((row) => (
								<AporteRow
									key={row.installmentIndex}
									aporte={row}
									businessId={businessId ?? 0}
									canMutate={canMutate}
									isLoading={loadingIndex === row.installmentIndex}
									now={now}
									onTransitionSuccess={handleTransitionSuccess}
									onRequestAction={handleRequestAction}
									onEditFundedDate={canMutate ? (idx) => setEditFundedDateIndex(idx) : undefined}
						installmentIndex={row.installmentIndex}
						isBusinessEmitido={isBusinessEmitido}
								/>
							))}
						</ul>
						{installments.length === 0 && !isLoadingInstallments && (
							<p className="text-sm text-muted-foreground">
								No hay aportes para este negocio.
							</p>
						)}
					</div>
				)}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cerrar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>

		{pendingConfirm && (
			<ConfirmActionDialog
				open={true}
				title={DIALOG_CONFIG[pendingConfirm.action].title}
				description={DIALOG_CONFIG[pendingConfirm.action].description}
				confirmLabel={DIALOG_CONFIG[pendingConfirm.action].confirmLabel}
				onConfirm={() => void handleConfirmAction()}
				onCancel={() => setPendingConfirm(null)}
			/>
		)}

		{pendingCarteraPagado && (
			<ConfirmCarteraPagadoDialog
				open={true}
				index={pendingCarteraPagado.index}
				onConfirm={(paymentDate) => void handleCarteraPagadoConfirm(paymentDate)}
				onCancel={() => setPendingCarteraPagado(null)}
			/>
		)}

		{editFundedDateIndex !== null && businessId !== null && (
			<EditFundedDateModal
				open={true}
				businessId={businessId}
				index={editFundedDateIndex}
				onSuccess={(updated) => {
					handleTransitionSuccess(updated)
					setEditFundedDateIndex(null)
				}}
				onCancel={() => setEditFundedDateIndex(null)}
			/>
		)}

		{pendingFondearIndex !== null && businessId !== null && (
			<FundFirstPaymentDialog
				open={true}
				businessId={businessId}
				onSuccess={handleFundFirstPaymentSuccess}
				onCancel={() => setPendingFondearIndex(null)}
			/>
		)}

	</>
	)
}
