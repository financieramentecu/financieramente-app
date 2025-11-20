'use client'

import React from 'react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface DeleteConfirmModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	itemName: string
	onConfirm: () => Promise<void>
	isLoading?: boolean
}

export function DeleteConfirmModal({
	open,
	onOpenChange,
	itemName,
	onConfirm,
	isLoading = false,
}: DeleteConfirmModalProps) {
	const handleConfirm = async () => {
		try {
			await onConfirm()
			onOpenChange(false)
		} catch (error) {
			console.error('Error deleting item:', error)
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Se eliminará permanentemente{' '}
						<strong>{itemName}</strong>.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={isLoading}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isLoading ? 'Eliminando...' : 'Eliminar'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
