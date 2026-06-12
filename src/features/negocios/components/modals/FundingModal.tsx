'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Checkbox } from '@/features/shared/ui/checkbox'
import { Label } from '@/features/shared/ui/label'
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
import { formatDateBogota } from '@/features/shared/lib/format-date'
import { ConfirmActionDialog } from '@/features/shared/ui/confirm-action-dialog'
import { ConfirmCarteraPagadoDialog } from './ConfirmCarteraPagadoDialog'
import { useAporteTransitions } from '../../hooks/use-aporte-transitions'
import { canFundPayments } from '@/features/auth/lib/roles'

type ConfirmableAction = Exclude<AporteAction, 'UNMARK_CARTERA'>

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
	isSubmitting?: boolean
	periodicidadLabel?: string | null
	plazo?: number | null
	/** If false, the modal is read-only: no checkboxes or save button for SIN_FONDEAR rows */
	canFund?: boolean
	/** Role code of the current user — used to gate EN_CARTERA / PAGO_ANTICIPADO actions */
	roleCode?: string
	onConfirm: (fundedInstallmentIndexes: number[]) => Promise<void> | void
}

export function FundingModal({
	open,
	onOpenChange,
	businessId,
	contractLabel,
	installments: initialInstallments,
	isLoadingInstallments = false,
	isSubmitting = false,
	periodicidadLabel,
	plazo,
	canFund = true,
	roleCode,
	onConfirm,
}: FundingModalProps) {
	const [installments, setInstallments] =
		React.useState<PaymentInstallmentDto[]>(initialInstallments)
	const [selected, setSelected] = React.useState<Set<number>>(new Set())
	const hasSinFondear = installments.some(i => i.status === 'SIN_FONDEAR')
	const [pendingConfirm, setPendingConfirm] = React.useState<{ action: ConfirmableAction; index: number } | null>(null)
	const [pendingCarteraPagado, setPendingCarteraPagado] = React.useState<{ index: number } | null>(null)
	const [loadingIndex, setLoadingIndex] = React.useState<number | null>(null)
	const now = React.useMemo(() => new Date(), [])
	const { markCartera, markPagoAnticipado, markCarteraPagado } = useAporteTransitions()

	React.useEffect(() => {
		setInstallments(initialInstallments)
	}, [initialInstallments])

	React.useEffect(() => {
		if (!open) {
			setSelected(new Set())
		}
	}, [open])

	const canMutate = canFundPayments(roleCode)

	const pendingIndexes = installments
		.filter((i) => i.status === 'SIN_FONDEAR')
		.map((i) => i.installmentIndex)

	const toggleIndex = (idx: number) => {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(idx)) {
				next.delete(idx)
			} else {
				next.add(idx)
			}
			return next
		})
	}

	const canSubmit =
		selected.size > 0 && pendingIndexes.some((p) => selected.has(p))

	const handleConfirm = async () => {
		if (!canSubmit || isSubmitting) return
		await onConfirm(Array.from(selected).sort((a, b) => a - b))
	}

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
		} else {
			setPendingConfirm({ action, index })
		}
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

	const formatExpectedDate = (iso: string | null) => {
		if (!iso) return 'Por confirmar'
		return formatDateBogota(iso)
	}

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
							{installments.map((row) => {
								if (row.status !== 'SIN_FONDEAR') {
									return (
										<AporteRow
											key={row.installmentIndex}
											aporte={row}
											businessId={businessId ?? 0}
											canMutate={canMutate}
											isLoading={loadingIndex === row.installmentIndex}
											now={now}
											onTransitionSuccess={handleTransitionSuccess}
											onRequestAction={handleRequestAction}
										/>
									)
								}

								if (!canFund) {
									return (
										<li
											key={row.installmentIndex}
											className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
										>
											<div className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span className="font-medium">
													Aporte {row.installmentIndex}
												</span>
												<span className="text-xs text-muted-foreground">
													Fecha esperada: {formatExpectedDate(row.expectedDate)}
												</span>
											</div>
										</li>
									)
								}

								const checked = selected.has(row.installmentIndex)

								return (
									<li
										key={row.installmentIndex}
										className="flex flex-wrap items-start gap-3 rounded-md border border-border p-3"
									>
										<Checkbox
											id={`aporte-${row.installmentIndex}`}
											checked={checked}
											onCheckedChange={() => toggleIndex(row.installmentIndex)}
											disabled={isSubmitting}
											aria-label={`Aporte ${row.installmentIndex}`}
										/>
										<div className="flex min-w-0 flex-1 flex-col gap-0.5">
											<Label
												htmlFor={`aporte-${row.installmentIndex}`}
												className="cursor-pointer font-medium"
											>
												Aporte {row.installmentIndex}
											</Label>
											<span className="text-xs text-muted-foreground">
												Fecha esperada: {formatExpectedDate(row.expectedDate)}
											</span>
										</div>
									</li>
								)
							})}
						</ul>
						{installments.length === 0 && !isLoadingInstallments && (
							<p className="text-sm text-muted-foreground">
								No hay aportes para este negocio.
							</p>
						)}
					</div>
				)}

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
					>
						{canFund && hasSinFondear ? 'Cancelar' : 'Cerrar'}
					</Button>
					{canFund && hasSinFondear && (
						<Button
							type="button"
							onClick={() => void handleConfirm()}
							disabled={
								!canSubmit ||
								isSubmitting ||
								isLoadingInstallments ||
								installments.length === 0
							}
						>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Guardando…
								</>
							) : (
								'Guardar fondeo'
							)}
						</Button>
					)}
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

	</>
	)
}
