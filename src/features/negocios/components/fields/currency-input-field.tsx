'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { useFormattedInput } from '@/features/negocios/hooks/use-formatted-input'
import {
	getFieldError,
	getFieldClassName,
} from '@/features/negocios/lib/form-field-helpers'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

export interface CurrencyInputFieldProps {
	name: keyof BusinessFormData
	label: string
	placeholder?: string
	form: UseFormReturn<BusinessFormData>
	disabled?: boolean
	required?: boolean
	description?: React.ReactNode
	className?: string
}

/**
 * Campo especializado para valores monetarios con formato colombiano
 */
export function CurrencyInputField({
	name,
	label,
	placeholder = '0,00',
	form,
	disabled = false,
	required = false,
	description,
	className,
}: CurrencyInputFieldProps) {
	const { watch, setValue, formState } = form
	const { errors } = formState
	const formValue = watch(name) as number | undefined
	const error = errors[name]

	const { inputValue, handleChange, handleBlur } = useFormattedInput({
		type: 'currency',
		fieldName: name,
		formValue,
		setValue,
	})

	return (
		<div className={`space-y-2 ${className || ''}`.trim()}>
			<Label htmlFor={name} className="text-sm font-medium">
				{label} {required && <span className="text-red-500">*</span>}
			</Label>
			{description && (
				<div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm text-amber-900 leading-snug">
					{description}
				</div>
			)}
			<Input
				id={name}
				type="text"
				value={inputValue}
				onChange={handleChange}
				onBlur={handleBlur}
				placeholder={placeholder}
				disabled={disabled}
				className={getFieldClassName(error)}
			/>
			{error && <p className="text-xs text-red-500">{getFieldError(error)}</p>}
		</div>
	)
}
