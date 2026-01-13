'use client'

/**
 * Modal para cancelar un negocio
 * Incluye validación de motivo (20-500 caracteres) y contador
 */

import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Textarea } from '@/features/shared/ui/textarea'
import { Label } from '@/features/shared/ui/label'
import { Skeleton } from '@/features/shared/ui/skeleton'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/features/shared/ui/dialog'
import { BusinessStatusBadge } from '../ui/BusinessStatusBadge'
import { formatCurrency } from '@/lib/currency'
import type { BusinessEntity } from '../../types/business-entity.types'

const MIN_REASON_LENGTH = 20
const MAX_REASON_LENGTH = 500

export interface BusinessCancelModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	business: BusinessEntity | null
	isLoading?: boolean
	onConfirm: (reason: string) => Promise<void> | void
}

/**
 * Modal de cancelación de negocio
 *
 * @example
 * ```tsx
 * <BusinessCancelModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   business={selectedBusiness}
 *   onConfirm={handleConfirmCancel}
 * />
 * ```
 */
export function BusinessCancelModal({
	open,
	onOpenChange,
	business,
	isLoading = false,
	onConfirm,
}: BusinessCancelModalProps) {
	const [reason, setReason] = React.useState('')
	const [isSubmitting, setIsSubmitting] = React.useState(false)

	const characterCount = reason.length
	const isValidLength =
		characterCount >= MIN_REASON_LENGTH && characterCount <= MAX_REASON_LENGTH
	const canSubmit = isValidLength && !isSubmitting

	// Reset reason when modal closes
	React.useEffect(() => {
		if (!open) {
			setReason('')
		}
	}, [open])

	const handleConfirm = async () => {
		if (!canSubmit) return

		setIsSubmitting(true)
		try {
			await onConfirm(reason)
			setReason('')
			onOpenChange(false)
		} catch (error) {
			console.error('Error al cancelar negocio:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleCancel = () => {
		setReason('')
		onOpenChange(false)
	}

	if (isLoading) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-md">
					<CancelModalSkeleton />
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
					<DialogTitle className="text-lg font-semibold text-gray-900">
						Cancelar Negocio #{business.id}
					</DialogTitle>
				</DialogHeader>

				{/* Warning Message */}
				<div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
					<AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
					<span className="text-amber-800">
						Esta acción es irreversible. El negocio pasará a estado Cancelado y
						no podrá ser modificado posteriormente.
					</span>
				</div>

				{/* Business Info Summary */}
				<div className="space-y-2 py-3 px-3 bg-gray-50 rounded-lg">
					<div className="flex justify-between items-center">
						<span className="text-sm text-gray-600">Estado actual:</span>
						<BusinessStatusBadge status={business.status} />
					</div>
					<div className="flex justify-between items-center">
						<span className="text-sm text-gray-600"># Contrato:</span>
						<span className="text-sm font-medium">
							{business.contract || 'Sin asignar'}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-sm text-gray-600">Cliente:</span>
						<span className="text-sm font-medium">
							{business.client.fullName}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-sm text-gray-600">Cédula:</span>
						<span className="text-sm font-medium">
							{business.client.identityNumber}
						</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-sm text-gray-600">Producto:</span>
						<span className="text-sm font-medium">{business.product.name}</span>
					</div>
					<div className="flex justify-between items-center">
						<span className="text-sm text-gray-600">Valor:</span>
						<span className="text-sm font-semibold text-primary">
							{formatCurrency(business.value, business.currency.name)}
						</span>
					</div>
				</div>

				{/* Reason Input */}
				<div className="space-y-2">
					<Label
						htmlFor="cancel-reason"
						className="text-sm font-medium text-gray-900"
					>
						Motivo de cancelación
						<span className="text-red-500 ml-1">*</span>
					</Label>
					<Textarea
						id="cancel-reason"
						placeholder="Ingrese el motivo detallado de la cancelación..."
						value={reason}
						onChange={(e) =>
							setReason(e.target.value.slice(0, MAX_REASON_LENGTH))
						}
						className="min-h-[100px] resize-none"
						disabled={isSubmitting}
					/>
					<div className="flex justify-between items-center text-xs">
						<span
							className={
								characterCount < MIN_REASON_LENGTH
									? 'text-amber-600'
									: 'text-gray-500'
							}
						>
							{characterCount < MIN_REASON_LENGTH &&
								`Mínimo ${MIN_REASON_LENGTH} caracteres`}
						</span>
						<span
							className={
								characterCount > MAX_REASON_LENGTH * 0.9
									? 'text-amber-600'
									: 'text-gray-500'
							}
						>
							{characterCount}/{MAX_REASON_LENGTH}
						</span>
					</div>
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
						onClick={handleConfirm}
						disabled={!canSubmit}
						className="flex-1 bg-red-600 hover:bg-red-700 text-white"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Procesando cancelación...
							</>
						) : (
							'Confirmar Cancelación'
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
function CancelModalSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-6 w-48" />
			<Skeleton className="h-16 w-full" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
			</div>
			<Skeleton className="h-24 w-full" />
			<div className="flex gap-3">
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="h-10 flex-1" />
			</div>
		</div>
	)
}
