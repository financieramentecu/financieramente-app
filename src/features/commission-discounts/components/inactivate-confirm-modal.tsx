'use client'

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/features/shared/ui/alert-dialog'
import { Button } from '@/features/shared/ui/button'
import type { CommissionDiscount } from '@/features/commission-discounts/types/commission-discount.types'

interface InactivateConfirmModalProps {
	discount: CommissionDiscount | null
	isOpen: boolean
	onConfirm: () => Promise<void>
	onCancel: () => void
	isLoading: boolean
	error?: string | null
}

export function InactivateConfirmModal({
	discount,
	isOpen,
	onConfirm,
	onCancel,
	isLoading,
	error,
}: InactivateConfirmModalProps) {
	return (
		<AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<AlertDialogContent style={{ backgroundColor: '#F8FAFB', borderColor: '#DDE9EB' }}>
				<AlertDialogHeader>
					<AlertDialogTitle style={{ color: '#00545c' }}>
						Confirmar inactivación
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							{discount && (
								<p>
									¿Está seguro de que desea inactivar el descuento{' '}
									<strong>&apos;{discount.name}&apos;</strong> de tipo{' '}
									<strong>{discount.type}</strong> con porcentaje{' '}
									<strong>{Number(discount.percentage).toFixed(2)}%</strong>?
									Esta acción no se puede deshacer.
								</p>
							)}
							{error && (
								<p className="mt-2 text-sm text-destructive">{error}</p>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						onClick={onCancel}
						disabled={isLoading}
						autoFocus
						style={{ borderColor: '#DDE9EB' }}
					>
						Cancelar
					</AlertDialogCancel>
					<Button
						onClick={onConfirm}
						disabled={isLoading}
						className="cursor-pointer"
						style={{ backgroundColor: '#00545c', color: '#fff' }}
					>
						{isLoading ? (
							<span className="flex items-center gap-2">
								<span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
								Inactivando...
							</span>
						) : (
							'Confirmar'
						)}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
