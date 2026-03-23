'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Separator } from '@/features/shared/ui/separator'
import { FormSelectField } from '@/features/negocios/components/fields/form-select-field'
import { NumberInputField } from '@/features/negocios/components/fields/number-input-field'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

export interface ProductInfoSectionProps {
	form: UseFormReturn<BusinessFormData>
	companiesOptions: { value: string; label: string }[]
	productsOptions: { value: string; label: string; companyId: string }[]
	filteredProducts: { value: string; label: string; companyId: string }[]
	isBlocked: boolean
	/** Modo edición: deshabilita todos los campos */
	isEditMode?: boolean
}

/**
 * Sección del formulario para información del producto
 */
export function ProductInfoSection({
	form,
	companiesOptions,
	filteredProducts,
	isBlocked,
	isEditMode = false,
}: ProductInfoSectionProps) {
	const { setValue } = form

	const handleCompanyChange = React.useCallback(
		(_value: string) => {
			setValue('producto', '', { shouldValidate: true })
		},
		[setValue]
	)

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<h3 className="font-bold text-sm text-primary">
					Información del producto
				</h3>
				<Separator className="bg-border" />
			</div>

			<div className="grid grid-cols-2 gap-4">
				<FormSelectField
					name="company"
					label="Compañía"
					placeholder="Seleccione una compañía"
					options={companiesOptions}
					form={form}
					disabled={isBlocked || isEditMode}
					onValueChange={handleCompanyChange}
					required
				/>

				<FormSelectField
					name="producto"
					label="Producto"
					placeholder="Seleccione un producto"
					options={filteredProducts}
					form={form}
					disabled={isBlocked || isEditMode || filteredProducts.length === 0}
					required
				/>

				<NumberInputField
					name="terms"
					label="Plazo"
					placeholder="10"
					form={form}
					disabled={isBlocked || isEditMode}
					required
				/>
			</div>
		</div>
	)
}
