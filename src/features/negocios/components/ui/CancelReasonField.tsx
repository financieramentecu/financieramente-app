'use client'

/**
 * Campo de texto para motivo de cancelación con contador de caracteres
 */

import { Textarea } from '@/features/shared/ui/textarea'
import { Label } from '@/features/shared/ui/label'
import { cn } from '@/lib/utils'

const MIN_LENGTH = 20
const MAX_LENGTH = 500

interface CancelReasonFieldProps {
	value: string
	onChange: (value: string) => void
	disabled?: boolean
	className?: string
}
export function CancelReasonField({
	value,
	onChange,
	disabled = false,
	className,
}: CancelReasonFieldProps) {
	const characterCount = value.length
	const isUnderMinimum = characterCount > 0 && characterCount < MIN_LENGTH
	const isNearMaximum = characterCount > MAX_LENGTH * 0.9
	const isValid = characterCount >= MIN_LENGTH && characterCount <= MAX_LENGTH

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newValue = e.target.value.slice(0, MAX_LENGTH)
		onChange(newValue)
	}

	return (
		<div className={cn('space-y-2', className)}>
			<Label htmlFor="cancel-reason" className="text-sm font-medium">
				Motivo de cancelación
				<span className="text-red-500 ml-1">*</span>
			</Label>
			<Textarea
				id="cancel-reason"
				value={value}
				onChange={handleChange}
				placeholder="Ingrese el motivo detallado de la cancelación..."
				disabled={disabled}
				className={cn(
					'min-h-[100px] resize-none',
					isUnderMinimum && 'border-amber-500 focus:ring-amber-500'
				)}
			/>
			<div className="flex justify-between items-center text-xs">
				<span
					className={cn(isUnderMinimum ? 'text-amber-600' : 'text-muted-foreground')}
				>
					{isUnderMinimum && `Mínimo ${MIN_LENGTH} caracteres`}
					{isValid && <span className="text-green-600">Motivo válido</span>}
				</span>
				<span
					className={cn(
						'tabular-nums',
						isNearMaximum ? 'text-amber-600' : 'text-muted-foreground'
					)}
				>
					{characterCount}/{MAX_LENGTH}
				</span>
			</div>
		</div>
	)
}

/**
 * Exportar constantes para uso en validaciones externas
 */
export {
	MIN_LENGTH as CANCEL_REASON_MIN_LENGTH,
	MAX_LENGTH as CANCEL_REASON_MAX_LENGTH,
}
