'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/features/shared/ui/alert-dialog'

export interface ConfirmActionDialogProps {
	open: boolean
	title: string
	description: string
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void
	onCancel: () => void
}

export function ConfirmActionDialog({
	open,
	title,
	description,
	confirmLabel = 'Confirmar',
	cancelLabel = 'Cancelar',
	onConfirm,
	onCancel,
}: ConfirmActionDialogProps) {
	return (
		<AlertDialog open={open}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
