'use client'

/**
 * Input especializado para número de contrato con validación en tiempo real
 */

import * as React from 'react'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface ContractInputProps {
	value: string
	onChange: (value: string) => void
	isValidating?: boolean
	isValid?: boolean | null
	error?: string | null
	disabled?: boolean
	className?: string
}

/**
 * Input para número de contrato con indicadores de validación
 *
 * @example
 * ```tsx
 * const { isValidating, isValid, error, validateContract } = useContractValidation(businessId)
 *
 * <ContractInput
 *   value={contract}
 *   onChange={(value) => {
 *     setContract(value)
 *     validateContract(value)
 *   }}
 *   isValidating={isValidating}
 *   isValid={isValid}
 *   error={error}
 * />
 * ```
 */
export function ContractInput({
	value,
	onChange,
	isValidating = false,
	isValid = null,
	error = null,
	disabled = false,
	className,
}: ContractInputProps) {
	const showValidationState = value.length > 0 && !isValidating

	return (
		<div className={cn('space-y-2', className)}>
			<Label htmlFor="contract" className="text-sm font-medium">
				Número de Contrato
			</Label>
			<div className="relative">
				<Input
					id="contract"
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="Ej: PN0001234"
					disabled={disabled}
					className={cn(
						'pr-10',
						showValidationState && isValid === false && 'border-red-500',
						showValidationState && isValid === true && 'border-green-500'
					)}
				/>
				<div className="absolute right-3 top-1/2 -translate-y-1/2">
					{isValidating && (
						<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
					)}
					{showValidationState && isValid === true && (
						<CheckCircle2 className="h-4 w-4 text-green-500" />
					)}
					{showValidationState && isValid === false && (
						<XCircle className="h-4 w-4 text-red-500" />
					)}
				</div>
			</div>
			{error && <p className="text-sm text-red-500">{error}</p>}
		</div>
	)
}
