'use client'

import * as React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Textarea } from '@/features/shared/ui/textarea'
import { Label } from '@/features/shared/ui/label'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/features/shared/ui/dialog'

export interface CancelBusinessModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	businessId?: string
	onConfirm: (reason: string) => void
	onCancel?: () => void
}

export const CancelBusinessModal = React.forwardRef<
	HTMLDivElement,
	CancelBusinessModalProps
>(({ open, onOpenChange, businessId = 'xxxxx', onConfirm, onCancel }, ref) => {
	const [reason, setReason] = React.useState('')
	const [isSubmitting, setIsSubmitting] = React.useState(false)

	const handleConfirm = async () => {
		if (!reason.trim()) {
			return
		}

		setIsSubmitting(true)
		try {
			await onConfirm(reason)
		} catch (error) {
			console.error('Error canceling business:', error)
			return
		} finally {
			setIsSubmitting(false)
		}

		setReason('')
		onOpenChange(false)
	}

	const handleCancel = () => {
		setReason('')
		onCancel?.()
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent ref={ref} className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-lg font-semibold text-foreground">
						Cancelar negocio #{businessId}
					</DialogTitle>
				</DialogHeader>

				<div className="flex items-start gap-2 text-sm text-muted-foreground mt-2 mb-4">
					<AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
					<span>
						Esta acción es irreversible. El negocio pasará a estado Cancelado y
						no podrá ser modificado posteriormente.
					</span>
				</div>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label
							htmlFor="cancel-reason"
							className="text-sm font-medium text-foreground"
						>
							Explicación del motivo por el cual se cancelara el negocio
							<span className="text-red-500 ml-1">*</span>
						</Label>
						<Textarea
							id="cancel-reason"
							placeholder="Describe el motivo de la cancelación..."
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							className="min-h-[120px] resize-none"
							required
						/>
					</div>

					<p className="text-sm font-semibold text-foreground">
						¿Esta seguro de cancelar el negocio?
					</p>
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
						disabled={!reason.trim() || isSubmitting}
						className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
					>
						{isSubmitting ? 'Confirmando...' : 'Confirmar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
})

CancelBusinessModal.displayName = 'CancelBusinessModal'
