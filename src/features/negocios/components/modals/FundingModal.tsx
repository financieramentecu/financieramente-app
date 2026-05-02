'use client'

/**
 * Modal para selección de aportes a marcar como fondeados
 */

import * as React from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
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

export interface FundingModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	businessId: number | null
	/** Texto del contrato (columna Contrato); si viene vacío se usa Negocio #id como respaldo */
	contractLabel?: string | null
	installments: PaymentInstallmentDto[]
	isLoadingInstallments?: boolean
	isSubmitting?: boolean
	/** Periodicidad del negocio (nombre legible, e.g. "Mensual") */
	periodicidadLabel?: string | null
	/** Plazo del negocio en años */
	plazo?: number | null
	/** Si false, el modal es solo lectura: sin checkboxes ni botón guardar */
	canFund?: boolean
	onConfirm: (fundedInstallmentIndexes: number[]) => Promise<void> | void
}

export function FundingModal({
	open,
	onOpenChange,
	businessId,
	contractLabel,
	installments,
	isLoadingInstallments = false,
	isSubmitting = false,
	periodicidadLabel,
	plazo,
	canFund = true,
	onConfirm,
}: FundingModalProps) {
	const [selected, setSelected] = React.useState<Set<number>>(new Set())

	React.useEffect(() => {
		if (!open) {
			setSelected(new Set())
		}
	}, [open])

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
		try {
			return new Date(iso).toLocaleDateString('es-CO', {
				dateStyle: 'medium',
			})
		} catch {
			return iso
		}
	}

	const formatAnchoredDate = (iso: string | null) => {
		if (!iso) return '—'
		try {
			return new Date(iso).toLocaleString('es-CO', {
				dateStyle: 'short',
				timeStyle: 'short',
			})
		} catch {
			return iso
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						Fondear aportes
						{contractSuffix}
					</DialogTitle>
					{headerMeta && (
						<p className="text-sm text-muted-foreground pt-0.5">
							{headerMeta}
						</p>
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
						{canFund && (
							<p className="text-sm text-muted-foreground">
								Marque los aportes que el cliente ya pagó. Los ya registrados no
								se pueden quitar en esta versión.
							</p>
						)}
						<ul className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
							{installments.map((row) => {
								const isPending = row.status === 'SIN_FONDEAR'
								const checked = isPending && selected.has(row.installmentIndex)

								if (!isPending) {
									return (
										<li
											key={row.installmentIndex}
											className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5"
										>
											<CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden />
											<span className="text-xs text-muted-foreground">
												<span className="font-medium">Aporte {row.installmentIndex}</span>
												{' · '}
												{formatAnchoredDate(row.dateAnchored)}
											</span>
										</li>
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
						{canFund ? 'Cancelar' : 'Cerrar'}
					</Button>
					{canFund && (
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
	)
}
