'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Separator } from '@/features/shared/ui/separator'
import { FormSelectField } from '@/features/negocios/components/fields/form-select-field'
import { CurrencyInputField } from '@/features/negocios/components/fields/currency-input-field'
import { NumberInputField } from '@/features/negocios/components/fields/number-input-field'
import { ContractAutocomplete } from '@/features/negocios/components/fields/contract-autocomplete'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

export interface BusinessInfoSectionProps {
	form: UseFormReturn<BusinessFormData>
	currenciesOptions: { value: string; label: string }[]
	periodicitiesOptions: { value: string; label: string }[]
	companiesOptions: { value: string; label: string; idCurrency?: string }[]
	filteredProducts: { value: string; label: string; companyId: string }[]
	onSelectLag?: (id: number | null) => void
	isBlocked: boolean
	isEditMode?: boolean
	contractDisabled?: boolean
}

/**
 * Sección del formulario para información del negocio
 */
export function BusinessInfoSection({
	form,
	currenciesOptions,
	periodicitiesOptions,
	companiesOptions,
	filteredProducts,
	onSelectLag,
	isBlocked,
	isEditMode = false,
	contractDisabled = false,
}: BusinessInfoSectionProps) {
	const { register, watch, setValue, formState } = form
	const { errors } = formState

	const contractValue = watch('contract')
	const contractRegister = register('contract')

	const handleCompanyChange = React.useCallback(
		(companyId: string) => {
			setValue('producto', '', { shouldValidate: true })

			if (!companyId) {
				setValue('currency', '', { shouldValidate: true })
				return
			}

			const selectedCompany = companiesOptions.find((c) => c.value === companyId)
			if (selectedCompany?.idCurrency) {
				setValue('currency', selectedCompany.idCurrency, { shouldValidate: true })
			}
		},
		[setValue, companiesOptions]
	)

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<h3 className="font-bold text-lg text-primary tracking-wider">
					Información del negocio
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

				<NumberInputField
					name="terms"
					label="Plazo de producto en años"
					placeholder="10"
					form={form}
					disabled={isBlocked || isEditMode}
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
					className="col-span-2"
					description={
						<>
							Si estas registrando un <strong>Negocio Internacional</strong> elige el nombre del producto <strong>teniendo en cuenta la categoria del asesor</strong> que tienes con el aliado. <strong>Esto lo encuentras al final del nombre del producto.</strong>
						</>
					}
				/>

				<FormSelectField
					name="periodicity"
					label="Periodicidad"
					placeholder="Seleccione periodicidad"
					options={periodicitiesOptions}
					form={form}
					disabled={isBlocked || isEditMode}
					required
				/>

				<div className="space-y-2">
					<Label htmlFor="contract" className="text-sm font-medium">
						Nro. Contrato{' '}
						{isEditMode && <span className="text-red-500">*</span>}
					</Label>
					{isEditMode ? (
						<ContractAutocomplete
							value={contractValue || ''}
							onChange={(val) => setValue('contract', val, { shouldValidate: true })}
							onSelectLag={onSelectLag}
							disabled={contractDisabled}
							className={errors.contract ? 'border-red-500' : ''}
						/>
					) : (
						<Input
							id="contract"
							name={contractRegister.name}
							value={contractValue || ''}
							onChange={(e) => {
								contractRegister.onChange(e)
								setValue('contract', e.target.value, { shouldValidate: true })
							}}
							onBlur={contractRegister.onBlur}
							ref={contractRegister.ref}
							placeholder="XXX XXX X"
							disabled={contractDisabled}
							className={errors.contract ? 'border-red-500' : ''}
						/>
					)}
					{errors.contract && (
						<p className="text-xs text-red-500">{errors.contract.message as string}</p>
					)}
					{isEditMode && (
						<p className="text-xs text-muted-foreground">
							Ingrese el número de contrato para cambiar el estado a Emitido
						</p>
					)}
				</div>

				<FormSelectField
					name="currency"
					label="Moneda"
					placeholder="Seleccione una moneda"
					options={currenciesOptions}
					form={form}
					disabled={isBlocked || isEditMode || !!watch('company')}
					required
					className="col-span-2"
				/>

				<CurrencyInputField
					name="value"
					label="Valor del Negocio"
					placeholder="0,00"
					form={form}
					disabled={isBlocked || isEditMode}
					required
					className="col-span-2"
					description={
						<div className="space-y-1 mt-1 text-foreground font-normal">
							<p className="font-bold">Notas Importantes:</p>
							<ol className="list-decimal pl-4 space-y-1">
								<li>Si el negocio es &quot;Crea Patrimonio&quot; de Skandia por favor poner el valor de la prima mensual multiplicado por 12 meses, es decir, el pago anualizado.</li>
								<li>Si tu cliente toma un producto internacional registra el valor del primer aporte.</li>
							</ol>
						</div>
					}
				/>
			</div>
		</div>
	)
}
