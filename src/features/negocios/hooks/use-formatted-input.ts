import * as React from 'react'
import { UseFormSetValue } from 'react-hook-form'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/currency'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

export type FormattedInputType = 'currency' | 'number'

interface UseFormattedInputOptions {
	type: FormattedInputType
	fieldName: keyof BusinessFormData
	formValue: number | undefined
	setValue: UseFormSetValue<BusinessFormData>
}

/**
 * Hook para manejar inputs con formato (currency o number)
 * Maneja estado local del input y sincroniza con el formulario
 */
export function useFormattedInput({
	type,
	fieldName,
	formValue,
	setValue,
}: UseFormattedInputOptions) {
	// Estado local para el valor del input
	const [inputValue, setInputValue] = React.useState<string>(() => {
		if (formValue !== undefined && formValue !== null) {
			return type === 'currency'
				? formatCurrencyInput(formValue)
				: formValue.toString()
		}
		return ''
	})

	// Sincronizar estado local con el formulario cuando cambian los valores del formulario
	React.useEffect(() => {
		if (formValue !== undefined && formValue !== null) {
			const formatted =
				type === 'currency'
					? formatCurrencyInput(formValue)
					: formValue.toString()
			setInputValue(formatted)
		} else {
			setInputValue('')
		}
	}, [formValue, type])

	// Handler para onChange
	const handleChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const rawValue = e.target.value
			// Actualizar el estado local inmediatamente para permitir borrar
			setInputValue(rawValue)

			if (type === 'currency') {
				// Parsear el valor y actualizar el formulario si es válido
				const parsedValue = parseCurrencyInput(rawValue)
				if (parsedValue !== null && parsedValue >= 0) {
					setValue(fieldName, parsedValue as never, { shouldValidate: true })
				} else if (rawValue === '' || rawValue.trim() === '') {
					// Permitir campo vacío temporalmente mientras el usuario escribe
					// No actualizar el formulario para mantener el valor anterior
				}
			} else {
				// Para números simples
				if (rawValue === '' || rawValue === '-') {
					return
				}
				const numValue = Number(rawValue)
				if (!isNaN(numValue) && isFinite(numValue) && numValue > 0) {
					setValue(fieldName, numValue as never, { shouldValidate: true })
				}
			}
		},
		[type, fieldName, setValue]
	)

	// Handler para onBlur
	const handleBlur = React.useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			const rawValue = e.target.value.trim()

			if (type === 'currency') {
				// Si el campo queda vacío o solo tiene caracteres especiales, limpiar
				if (rawValue === '' || /^[.,\s]+$/.test(rawValue)) {
					setInputValue('')
					// Establecer 0 como valor por defecto para cumplir con el esquema
					setValue(fieldName, 0 as never, { shouldValidate: true })
					return
				}

				// Formatear el valor al perder el foco
				const parsedValue = parseCurrencyInput(rawValue)
				if (parsedValue !== null && parsedValue >= 0) {
					const formatted = formatCurrencyInput(parsedValue)
					setInputValue(formatted)
					setValue(fieldName, parsedValue as never, { shouldValidate: true })
				} else {
					// Si no se puede parsear, limpiar el campo y establecer 0
					setInputValue('')
					setValue(fieldName, 0 as never, { shouldValidate: true })
				}
			} else {
				// Para números simples
				if (rawValue === '' || rawValue === '-') {
					setInputValue('')
				}
			}
		},
		[type, fieldName, setValue]
	)

	return {
		inputValue,
		handleChange,
		handleBlur,
	}
}
