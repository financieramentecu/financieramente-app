'use client'

import * as React from 'react'
import { Button } from '@/features/shared/ui/button'

export interface FormActionsProps {
	onCancel?: () => void
	isSubmitting: boolean
	isBlocked: boolean
	/** Modo edición: cambia el texto del botón */
	isEditMode?: boolean
}

/**
 * Componente para los botones de acción del formulario
 */
export function FormActions({
	onCancel,
	isSubmitting,
	isBlocked,
	isEditMode = false,
}: FormActionsProps) {
	// En modo edición, el formulario nunca está bloqueado por falta de documento
	const isDisabled = isSubmitting || (!isEditMode && isBlocked)

	const submitText = isSubmitting
		? 'Guardando...'
		: isEditMode
			? 'Actualizar Negocio'
			: 'Aceptar y Guardar'

	return (
		<div className="flex justify-end gap-3 pt-4 border-t">
			<Button
				type="button"
				variant="ghost"
				onClick={onCancel}
				disabled={isSubmitting}
				className="text-primary hover:text-primary hover:bg-muted"
			>
				Cancelar
			</Button>
			<Button
				type="submit"
				disabled={isDisabled}
				className="bg-primary hover:bg-primary/90 text-primary-foreground"
			>
				{submitText}
			</Button>
		</div>
	)
}
