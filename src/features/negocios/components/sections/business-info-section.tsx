'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Separator } from '@/features/shared/ui/separator'
import { FormSelectField } from '@/features/negocios/components/fields/form-select-field'
import { CurrencyInputField } from '@/features/negocios/components/fields/currency-input-field'
import { NumberInputField } from '@/features/negocios/components/fields/number-input-field'
import { AgentAutocomplete } from '@/features/negocios/components/fields/agent-autocomplete'
import { ContractAutocomplete } from '@/features/negocios/components/fields/contract-autocomplete'
import {
	getFieldError,
	getFieldClassName,
} from '@/features/negocios/lib/form-field-helpers'
import { UserWithRole } from '@/features/negocios/types/business.types'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

export interface BusinessInfoSectionProps {
	form: UseFormReturn<BusinessFormData>
	currenciesOptions: { value: string; label: string }[]
	periodicitiesOptions: { value: string; label: string }[]
	companiesOptions: { value: string; label: string }[]
	filteredProducts: { value: string; label: string; companyId: string }[]
	agentsList: UserWithRole[]
	onSearchAgents?: (query: string) => Promise<UserWithRole[]>
	onSelectLag?: (id: number | null) => void
	isBlocked: boolean
	isAgentUser: boolean
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
	agentsList,
	onSearchAgents,
	onSelectLag,
	isBlocked,
	isAgentUser,
	isEditMode = false,
	contractDisabled = false,
}: BusinessInfoSectionProps) {
	const { register, watch, setValue, formState } = form
	const { errors } = formState
	
	const agentValue = watch('agent')
	const agentError = errors.agent
	const contractValue = watch('contract')
	const contractRegister = register('contract')

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
					Información del negocio
				</h3>
				<Separator className="bg-border" />
			</div>

			<div className="grid grid-cols-2 gap-4">
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

				<FormSelectField
					name="periodicity"
					label="Periodicidad"
					placeholder="Seleccione periodicidad"
					options={periodicitiesOptions}
					form={form}
					disabled={isBlocked || isEditMode}
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

				<FormSelectField
					name="currency"
					label="Moneda"
					placeholder="Seleccione una moneda"
					options={currenciesOptions}
					form={form}
					disabled={isBlocked || isEditMode}
					required
				/>

				<div className="space-y-2">
					<CurrencyInputField
						name="value"
						label="Valor"
						placeholder="0,00"
						form={form}
						disabled={isBlocked || isEditMode}
						required
					/>
					{!isEditMode && (
						<div className="text-xs text-muted-foreground">
							Recuerde que el campo Valor debe ser equivalente al valor de la prima por 12
						</div>
					)}
				</div>

				<div className="space-y-2">
					<Label
						htmlFor="agent"
						id="agent-label"
						className="text-sm font-medium"
					>
						Agente <span className="text-red-500">*</span>
					</Label>
					<AgentAutocomplete
						value={agentValue}
						onChange={(value) =>
							setValue('agent', value, { shouldValidate: true })
						}
						agents={agentsList}
						placeholder="Buscar agente..."
						aria-labelledby="agent-label"
						disabled={isBlocked || isAgentUser || isEditMode}
						className={getFieldClassName(agentError)}
						onSearch={onSearchAgents}
					/>
					{agentError && (
						<p className="text-xs text-red-500">{getFieldError(agentError)}</p>
					)}
				</div>
			</div>
		</div>
	)
}
