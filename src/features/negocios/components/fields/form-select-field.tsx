'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Label } from '@/features/shared/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import {
	getFieldError,
	getFieldClassName,
} from '@/features/negocios/lib/form-field-helpers'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

export interface FormSelectFieldProps {
	name: keyof BusinessFormData
	label: string
	placeholder: string
	options: { value: string; label: string }[]
	form: UseFormReturn<BusinessFormData>
	disabled?: boolean
	helperText?: string
	onValueChange?: (value: string) => void
	required?: boolean
}

/**
 * Componente reutilizable para campos Select con manejo de errores
 */
export function FormSelectField({
	name,
	label,
	placeholder,
	options,
	form,
	disabled = false,
	helperText,
	onValueChange,
	required = false,
}: FormSelectFieldProps) {
	const { setValue, watch, formState } = form
	const { errors } = formState
	const value = watch(name) as string
	const error = errors[name]

	const handleValueChange = (newValue: string) => {
		setValue(name, newValue as never, { shouldValidate: true })
		onValueChange?.(newValue)
	}

	return (
		<div className="space-y-2">
			<Label htmlFor={name} className="text-sm font-medium">
				{label} {required && <span className="text-red-500">*</span>}
			</Label>
			<Select
				disabled={disabled}
				value={value || ''}
				onValueChange={handleValueChange}
			>
				<SelectTrigger id={name} className={getFieldClassName(error)}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && <p className="text-xs text-red-500">{getFieldError(error)}</p>}
			{helperText && !error && (
				<p className="text-xs text-gray-500">{helperText}</p>
			)}
		</div>
	)
}
