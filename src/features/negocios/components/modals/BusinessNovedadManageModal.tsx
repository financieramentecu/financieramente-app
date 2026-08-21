'use client'

/**
 * Modal de gestión manual del estado de novedad de un negocio (backoffice).
 * Shape/patrón inspirado en `BusinessCancelModal` — trigger visible solo
 * para ANALISTA_SOPORTE/ADMIN, movimiento libre entre los 4 estados
 * manuales (sin estado terminal).
 */

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Label } from '@/features/shared/ui/label'
import { Skeleton } from '@/features/shared/ui/skeleton'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/features/shared/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { BusinessNovedadBadge } from '../ui/BusinessNovedadBadge'
import {
	MANUAL_NOVEDAD_STATUSES,
	type BusinessEntity,
	type BusinessNovedadStatus,
} from '../../types/business-entity.types'

/** Etiquetas legibles para los 4 estados manuales (selector de gestión) */
const MANUAL_STATUS_LABELS: Record<
	(typeof MANUAL_NOVEDAD_STATUSES)[number],
	string
> = {
	SOMETIDA_DEVOLUCION: 'Sometida a Devolución',
	DECLINADA: 'Declinada',
	PENDIENTE: 'Pendiente',
	CANCELADA: 'Cancelada',
}

export interface BusinessNovedadManageModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	business: BusinessEntity | null
	isLoading?: boolean
	onConfirm: (novedadStatus: BusinessNovedadStatus) => Promise<void> | void
}

/**
 * Modal de gestión manual de novedad
 *
 * @example
 * ```tsx
 * <BusinessNovedadManageModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   business={selectedBusiness}
 *   onConfirm={handleConfirmManage}
 * />
 * ```
 */
export function BusinessNovedadManageModal({
	open,
	onOpenChange,
	business,
	isLoading = false,
	onConfirm,
}: BusinessNovedadManageModalProps) {
	const [selectedStatus, setSelectedStatus] = React.useState<string>('')
	const [isSubmitting, setIsSubmitting] = React.useState(false)

	const canSubmit = selectedStatus !== '' && !isSubmitting

	// Reset selection when modal closes
	React.useEffect(() => {
		if (!open) {
			setSelectedStatus('')
		}
	}, [open])

	const handleConfirm = async () => {
		if (!canSubmit) return

		setIsSubmitting(true)
		try {
			await onConfirm(selectedStatus as BusinessNovedadStatus)
			setSelectedStatus('')
			onOpenChange(false)
		} catch (error) {
			console.error('Error al gestionar novedad de negocio:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleCancel = () => {
		setSelectedStatus('')
		onOpenChange(false)
	}

	if (isLoading) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-md">
					<ManageModalSkeleton />
				</DialogContent>
			</Dialog>
		)
	}

	if (!business) {
		return null
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-lg font-semibold text-foreground">
						Gestionar Novedad #{business.id}
					</DialogTitle>
				</DialogHeader>

				<div className="flex items-center justify-between p-3 rounded-lg bg-muted">
					<span className="text-sm text-muted-foreground">Estado actual:</span>
					<BusinessNovedadBadge novedadStatus={business.novedadStatus} />
				</div>

				<div className="space-y-2">
					<Label htmlFor="manage-novedad-status" className="text-sm font-medium text-foreground">
						Nuevo estado
						<span className="text-red-500 ml-1">*</span>
					</Label>
					<Select
						value={selectedStatus}
						onValueChange={setSelectedStatus}
						disabled={isSubmitting}
					>
						<SelectTrigger id="manage-novedad-status">
							<SelectValue placeholder="Seleccione un estado" />
						</SelectTrigger>
						<SelectContent>
							{MANUAL_NOVEDAD_STATUSES.map((status) => (
								<SelectItem key={status} value={status}>
									{MANUAL_STATUS_LABELS[status]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<DialogFooter className="gap-3 sm:gap-3">
					<Button
						variant="outline"
						onClick={handleCancel}
						disabled={isSubmitting}
						className="flex-1"
					>
						Cancelar
					</Button>
					<Button
						onClick={() => void handleConfirm()}
						disabled={!canSubmit}
						className="flex-1"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Guardando...
							</>
						) : (
							'Confirmar'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

/**
 * Skeleton para estado de carga
 */
function ManageModalSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-6 w-48" />
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-10 w-full" />
			<div className="flex gap-3">
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="h-10 flex-1" />
			</div>
		</div>
	)
}
