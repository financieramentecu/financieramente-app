'use client'

/**
 * Modal HU4 — selección de cuotas anuales a marcar como fondeadas
 */

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
import type { AnnualInstallmentDto } from '../../types/business-api.types'

export interface AnnualFundingModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	businessId: number | null
	/** Texto del contrato (columna Contrato); si viene vacío se usa Negocio #id como respaldo */
	contractLabel?: string | null
	installments: AnnualInstallmentDto[]
	isLoadingInstallments?: boolean
	isSubmitting?: boolean
	onConfirm: (fundedInstallmentIndexes: number[]) => Promise<void> | void
}

export function AnnualFundingModal({
	open,
	onOpenChange,
	businessId,
	contractLabel,
	installments,
	isLoadingInstallments = false,
	isSubmitting = false,
	onConfirm,
}: AnnualFundingModalProps) {
	const [selected, setSelected] = React.useState<Set<number>>(new Set())

	React.useEffect(() => {
		if (!open) {
			setSelected(new Set())
		}
	}, [open])

	const pendingIndexes = React.useMemo(
		() =>
			installments
				.filter((i) => i.status === 'SIN_FONDEAR')
				.map((i) => i.installmentIndex),
		[installments]
	)

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

	const formatDate = (iso: string | null) => {
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
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						Fondear anualidades
						{contractSuffix}
					</DialogTitle>
				</DialogHeader>

				{isLoadingInstallments ? (
					<div className="space-y-3 py-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : (
					<div className="space-y-4 py-2">
						<p className="text-sm text-muted-foreground">
							Marque las cuotas que el cliente ya pagó. Las ya registradas no
							se pueden quitar en esta versión.
						</p>
						<ul className="space-y-3">
							{installments.map((row) => {
								const isPending = row.status === 'SIN_FONDEAR'
								const checked =
									isPending && selected.has(row.installmentIndex)

								return (
									<li
										key={row.installmentIndex}
										className="flex flex-wrap items-start gap-3 rounded-md border border-border p-3"
									>
										{isPending ? (
											<>
												<Checkbox
													id={`ann-${row.installmentIndex}`}
													checked={checked}
													onCheckedChange={() =>
														toggleIndex(row.installmentIndex)
													}
													disabled={isSubmitting}
													aria-label={`Anualidad ${row.installmentIndex}`}
												/>
												<div className="flex min-w-0 flex-1 flex-col gap-0.5">
													<Label
														htmlFor={`ann-${row.installmentIndex}`}
														className="cursor-pointer font-medium"
													>
														Anualidad {row.installmentIndex}
													</Label>
													<span className="text-xs text-muted-foreground">
														Pendiente de fondear
													</span>
												</div>
											</>
										) : (
											<div className="flex min-w-0 flex-1 flex-col gap-0.5 pl-1">
												<span className="font-medium">
													Anualidad {row.installmentIndex}
												</span>
												<span className="text-sm text-muted-foreground">
													Fondeado — {formatDate(row.dateAnchored)}
												</span>
											</div>
										)}
									</li>
								)
							})}
						</ul>
						{installments.length === 0 && !isLoadingInstallments && (
							<p className="text-sm text-muted-foreground">
								No hay cuotas anuales para este negocio.
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
						Cancelar
					</Button>
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
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
