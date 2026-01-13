import { FieldError } from 'react-hook-form'
import { cn } from '@/lib/utils'

/**
 * Obtiene el mensaje de error de un campo del formulario
 */
export function getFieldError(
	error: FieldError | undefined
): string | undefined {
	return error?.message
}

/**
 * Obtiene las clases CSS para un campo con estado de error
 */
export function getFieldClassName(
	error: FieldError | undefined,
	baseClassName?: string
): string {
	return cn(baseClassName, error && 'border-red-500')
}

/**
 * Determina si un campo debe estar deshabilitado
 */
export function shouldDisableField(
	isBlocked: boolean,
	additionalCondition?: boolean
): boolean {
	return isBlocked || (additionalCondition ?? false)
}
