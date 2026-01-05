'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Label } from '@/features/shared/ui/label'
import { Separator } from '@/features/shared/ui/separator'
import { FormSelectField } from '@/features/negocios/components/fields/form-select-field'
import { CurrencyInputField } from '@/features/negocios/components/fields/currency-input-field'
import { AgentAutocomplete } from '@/features/negocios/components/fields/agent-autocomplete'
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
	agentsList: UserWithRole[]
	onSearchAgents?: (query: string) => Promise<UserWithRole[]>
	isBlocked: boolean
	isAgentUser: boolean
	isEditMode?: boolean
}

/**
 * Sección del formulario para información del negocio
 */
export function BusinessInfoSection({
	form,
	currenciesOptions,
	periodicitiesOptions,
	agentsList,
	onSearchAgents,
	isBlocked,
	isAgentUser,
	isEditMode = false,
}: BusinessInfoSectionProps) {
	const { watch, setValue, formState } = form
	const { errors } = formState
	const agentValue = watch('agent')
	const agentError = errors.agent

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<h3 className="font-bold text-sm text-[#00505C]">
					Información del negocio
				</h3>
				<Separator className="bg-gray-300" />
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<FormSelectField
						name="currency"
						label="Moneda"
						placeholder="Seleccione una moneda"
						options={currenciesOptions}
						form={form}
						disabled={isBlocked || isEditMode}
					/>

					{!isEditMode && (
						<div className="mt-2">
							<p className="text-sm font-medium mb-2">Valor del negocio</p>
							<div className="text-xs text-gray-500 space-y-1">
								<p>1. Si el negocio es Crea Patrimonio de Skandia....</p>
								<p>2. Si tu cliente toma......</p>
							</div>
						</div>
					)}
				</div>

				<FormSelectField
					name="periodicity"
					label="Periodicidad"
					placeholder="Seleccione periodicidad"
					options={periodicitiesOptions}
					form={form}
					disabled={isBlocked || isEditMode}
				/>

				<CurrencyInputField
					name="value"
					label="Valor"
					placeholder="0,00"
					form={form}
					disabled={isBlocked || isEditMode}
				/>

				<div className="space-y-2">
					<Label
						htmlFor="agent"
						id="agent-label"
						className="text-sm font-medium"
					>
						Agente
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
