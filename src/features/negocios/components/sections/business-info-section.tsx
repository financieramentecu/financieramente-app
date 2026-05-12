'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Separator } from '@/features/shared/ui/separator'
import { FormSelectField } from '@/features/negocios/components/fields/form-select-field'
import { CurrencyInputField } from '@/features/negocios/components/fields/currency-input-field'
import { NumberInputField } from '@/features/negocios/components/fields/number-input-field'
import { ContractAutocomplete } from '@/features/negocios/components/fields/contract-autocomplete'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import { calculateNumAportes } from '@/features/negocios/lib/calculate-num-aportes'
import type {
	BusinessFormField,
	FieldPermission,
} from '@/features/negocios/hooks/use-business-permissions'
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
	isPrivilegedRole?: boolean
	roleCode?: string
	getFieldPermission: (field: BusinessFormField) => FieldPermission
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
	isBlocked: _isBlocked,
	isEditMode = false,
	contractDisabled = false,
	isPrivilegedRole: _isPrivilegedRole = false,
	roleCode: _roleCode,
	getFieldPermission,
}: BusinessInfoSectionProps) {
	const { register, watch, setValue, formState } = form
	const { errors } = formState

	const contractValue = watch('contract')
	const contractRegister = register('contract')

	const watchedTerms = watch('terms')
	const watchedCompanyId = watch('company')
	const watchedProductId = watch('producto')
	const watchedPeriodicityId = watch('periodicity')
	const isSkandiaWithMfund = React.useMemo(() => {
		const companyName = companiesOptions.find((c) => c.value === watchedCompanyId)?.label ?? null
		const productName = filteredProducts.find((p) => p.value === watchedProductId)?.label ?? null
		return companyName === 'SKANDIA' && productName === 'MFUND'
	}, [watchedCompanyId, watchedProductId, companiesOptions, filteredProducts])

	const isFirstRender = React.useRef(true)

	React.useEffect(() => {
		// En modo edición, no recalculamos numAportes automáticamente para permitir edición manual
		if (isEditMode) {
			if (isFirstRender.current) {
				isFirstRender.current = false
			}
			// Solo actualizamos isSkandiaWithMfund para controlar el campo 'terms'
			const companyName = companiesOptions.find((c) => c.value === watchedCompanyId)?.label ?? null
			const productName = filteredProducts.find((p) => p.value === watchedProductId)?.label ?? null
			if (companyName === 'SKANDIA' && productName === 'MFUND') {
				setValue('isSkandiaWithMfund', true, { shouldValidate: false })
				setValue('terms', 0, { shouldValidate: false })
			} else {
				setValue('isSkandiaWithMfund', false, { shouldValidate: false })
			}
			return
		}

		// Modo creación: auto-calcular numAportes
		const companyName = companiesOptions.find((c) => c.value === watchedCompanyId)?.label ?? null
		const productName = filteredProducts.find((p) => p.value === watchedProductId)?.label ?? null
		const periodicityName = periodicitiesOptions.find((p) => p.value === watchedPeriodicityId)?.label ?? null
		const termYears = typeof watchedTerms === 'number' ? watchedTerms : null

		if (companyName === 'SKANDIA' && productName === 'MFUND') {
			setValue('isSkandiaWithMfund', true, { shouldValidate: false })
			setValue('terms', 0, { shouldValidate: false })
			setValue('numAportes', 0, { shouldValidate: false })
			return
		}

		setValue('isSkandiaWithMfund', false, { shouldValidate: false })

		const result = calculateNumAportes({ termYears, periodicityName, companyName, productName })
		setValue('numAportes', result, { shouldValidate: false })
	}, [watchedTerms, watchedPeriodicityId, watchedCompanyId, watchedProductId, companiesOptions, filteredProducts, periodicitiesOptions, setValue, isEditMode])

	const handleCompanyChange = React.useCallback(
		(companyId: string) => {
			setValue('producto', '', { shouldValidate: true })

			if (!companyId) {
				setValue('currency', '', { shouldValidate: true })
				return
			}

			const selectedCompany = companiesOptions.find(
				(c) => c.value === companyId
			)
			if (selectedCompany?.idCurrency) {
				setValue('currency', selectedCompany.idCurrency, {
					shouldValidate: true,
				})
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
				<div className="col-span-2 space-y-2">
					<Label htmlFor="contract" className="text-sm font-medium">
						Nro. Contrato{' '}
						{isEditMode && <span className="text-red-500">*</span>}
					</Label>
					{isEditMode ? (
						<ContractAutocomplete
							value={contractValue || ''}
							onChange={(val) =>
								setValue('contract', val, { shouldValidate: true })
							}
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
						<p className="text-xs text-red-500">
							{errors.contract.message as string}
						</p>
					)}
					{isEditMode && (
						<p className="text-xs text-muted-foreground">
							Ingrese el número de contrato para cambiar el estado a Emitido
						</p>
					)}
				</div>

				<FormSelectField
					name="company"
					label="Compañía"
					placeholder="Seleccione una compañía"
					options={companiesOptions}
					form={form}
					disabled={getFieldPermission('company').disabled}
					onValueChange={handleCompanyChange}
					required
				/>

				<FormSelectField
					name="producto"
					label="Producto"
					placeholder="Seleccione un producto"
					options={filteredProducts}
					form={form}
					disabled={getFieldPermission('producto').disabled || filteredProducts.length === 0}
					required
					description={''}
				/>

				<NumberInputField
					name="terms"
					label="Plazo de producto en años"
					placeholder="10"
					form={form}
					disabled={getFieldPermission('terms').disabled || isSkandiaWithMfund}
					required
				/>

				<FormSelectField
					name="periodicity"
					label="Periodicidad"
					placeholder="Seleccione periodicidad"
					options={periodicitiesOptions}
					form={form}
					disabled={getFieldPermission('periodicity').disabled}
					required
				/>

				<div className="space-y-2">
					<Label htmlFor="numAportes" className="text-sm font-medium">
						Número de Aportes
					</Label>
					<Input
						id="numAportes"
						type="number"
						{...register('numAportes', { valueAsNumber: true })}
						readOnly={getFieldPermission('numAportes').readonly}
						disabled={getFieldPermission('numAportes').disabled}
						className={cn(
							getFieldPermission('numAportes').disabled && "bg-muted cursor-not-allowed"
						)}
					/>
				</div>

				<FormSelectField
					name="currency"
					label="Moneda"
					placeholder="Seleccione una moneda"
					options={currenciesOptions}
					form={form}
					disabled={getFieldPermission('currency').disabled}
					required
				/>

				<CurrencyInputField
					name="value"
					label="Valor del Negocio"
					placeholder="0,00"
					form={form}
					disabled={getFieldPermission('value').disabled}
					required
					className="col-span-2"
					description={
						<div className="space-y-1 mt-1 text-foreground font-normal">
							<p>
								<span className="font-semibold">Nota Importante: </span>
								<span>Registra únicamente el valor del primer aporte.</span>
							</p>
						</div>
					}
				/>
			</div>
		</div>
	)
}
