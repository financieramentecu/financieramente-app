'use client'

import * as React from 'react'
import { Button } from '@/features/shared/ui/button'

export interface FormActionsProps {
	onCancel?: () => void
	isSubmitting: boolean
	isBlocked: boolean
}

/**
 * Componente para los botones de acción del formulario
 */
export function FormActions({
	onCancel,
	isSubmitting,
	isBlocked,
}: FormActionsProps) {
	return (
		<div className="flex justify-end gap-3 pt-4 border-t">
			<Button
				type="button"
				variant="ghost"
				onClick={onCancel}
				disabled={isSubmitting}
				className="text-[#00505C] hover:text-[#00505C] hover:bg-gray-100"
			>
				Cancelar
			</Button>
			<Button
				type="submit"
				disabled={isSubmitting || isBlocked}
				className="bg-[#00505C] hover:bg-[#003d47] text-white"
			>
				{isSubmitting ? 'Guardando...' : 'Aceptar y Guardar'}
			</Button>
		</div>
	)
}
