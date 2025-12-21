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

export interface NumberInputFieldProps {
	name: keyof BusinessFormData
	label: string
	placeholder?: string
	form: UseFormReturn<BusinessFormData>
	disabled?: boolean
}

/**
 * Campo especializado para números (plazo)
 */
export function NumberInputField({
	name,
	label,
	placeholder = '10',
	form,
	disabled = false,
}: NumberInputFieldProps) {
	const { watch, setValue, formState } = form
	const { errors } = formState
	const formValue = watch(name) as number | undefined
	const error = errors[name]

	const { inputValue, handleChange, handleBlur } = useFormattedInput({
		type: 'number',
		fieldName: name,
		formValue,
		setValue,
	})

	return (
		<div className="space-y-2">
			<Label htmlFor={name} className="text-sm font-medium">
				{label}
			</Label>
			<Input
				id={name}
				type="number"
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
