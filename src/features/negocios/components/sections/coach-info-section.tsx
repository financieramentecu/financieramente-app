'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Separator } from '@/features/shared/ui/separator'
import { AgentAutocomplete } from '@/features/negocios/components/fields/agent-autocomplete'
import {
	getFieldError,
	getFieldClassName,
} from '@/features/negocios/lib/form-field-helpers'
import { UserWithRole } from '@/features/negocios/types/business.types'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'


export interface CoachInfoSectionProps {
	form: UseFormReturn<BusinessFormData>
	agentsList: UserWithRole[]
	onSearchAgents?: (query: string) => Promise<UserWithRole[]>
	isBlocked: boolean
	isEditMode?: boolean
	isAgentUser?: boolean
}

/**
 * Sección del formulario para información del Coach (Agente)
 */
export function CoachInfoSection({
	form,
	agentsList,
	onSearchAgents,
	isBlocked,
	isEditMode = false,
	isAgentUser,
}: CoachInfoSectionProps) {
	const { watch, setValue, formState } = form
	const { errors } = formState

	const agentValue = watch('agent')
	const agentError = errors.agent

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<h3 className="font-bold text-lg text-primary tracking-wider">
					Información Money Strategist
				</h3>
				<Separator className="bg-border" />
			</div>

			<div className="grid grid-cols-1 gap-4">
				<div className="space-y-2">
					<Label
						htmlFor="agent"
						id="agent-label"
						className="text-sm font-medium"
					>
						Money Strategist <span className="text-red-500">*</span>
					</Label>
					{isEditMode ? (
						<Input
							value={(() => {
								const selected = agentsList.find(a => a.idUser.toString() === agentValue)
								if (!selected) return 'Money Strategist no encontrado'
								const name = `${selected.name} ${selected.lastName || ''}`.trim()
								return selected.category?.name ? `${name} (${selected.category.name})` : name
							})()}
							readOnly
							disabled
							className="bg-muted cursor-not-allowed font-medium"
						/>
					) : (
						<div className={cn("transition-opacity", isBlocked && "pointer-events-none opacity-70")}>
							<AgentAutocomplete
								value={agentValue}
								onChange={(value) =>
									setValue('agent', value, { shouldValidate: true })
								}
								agents={agentsList}
								placeholder="Buscar Money Strategist..."
								aria-labelledby="agent-label"
								disabled={isBlocked || isAgentUser}
								className={getFieldClassName(agentError)}
								onSearch={onSearchAgents}
							/>
						</div>
					)}
					{agentError && (
						<p className="text-xs text-red-500">{getFieldError(agentError)}</p>
					)}
				</div>
			</div>
		</div>
	)
}
