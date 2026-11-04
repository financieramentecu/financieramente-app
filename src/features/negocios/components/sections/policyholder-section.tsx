'use client'

import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { Separator } from '@/features/shared/ui/separator'
import { PolicyholderAutocomplete } from '@/features/negocios/components/fields/policyholder-autocomplete'
import { documentTypeOptionsForSelection } from '@/features/negocios/lib/document-type-options-for-selection'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import type {
	BusinessFormField,
	FieldPermission,
} from '@/features/negocios/hooks/use-business-permissions'
import type { DocumentTypeOption } from '@/features/document-types/types/document-type.types'
import type { PolicyholderSearchResult } from '@/features/policyholders/types/policyholder.types'
import type { UseFormReturn } from 'react-hook-form'

export interface PolicyholderSectionProps {
	form: UseFormReturn<BusinessFormData>
	documentTypeOptions: DocumentTypeOption[]
	results: PolicyholderSearchResult[]
	isSearching: boolean
	onQueryChange: (query: string) => void
	isBlocked: boolean
	getFieldPermission: (field: BusinessFormField) => FieldPermission
}

export function PolicyholderSection({
	form,
	documentTypeOptions,
	results,
	isSearching,
	onQueryChange,
	isBlocked,
	getFieldPermission,
}: PolicyholderSectionProps) {
	const {
		register,
		setValue,
		watch,
		formState: { errors },
	} = form
	const typeValue = watch('policyholderTypeIdentity')
	const documentValue = watch('policyholderIdentityNumber') ?? ''
	const visibleTypes = documentTypeOptionsForSelection(
		documentTypeOptions,
		typeValue
	)
	const fieldsDisabled =
		getFieldPermission('policyholderName').disabled || isBlocked

	const fillPolicyholder = (row: PolicyholderSearchResult) => {
		setValue('policyholderTypeIdentity', row.typeIdentity, {
			shouldValidate: true,
		})
		setValue('policyholderIdentityNumber', row.identityNumber, {
			shouldValidate: true,
		})
		setValue('policyholderEmail', row.email, { shouldValidate: true })
		setValue('policyholderName', row.name, { shouldValidate: true })
		setValue('policyholderLastNames', row.lastName, { shouldValidate: true })
		setValue('policyholderPhone', row.phone, { shouldValidate: true })
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<h3 className="font-bold text-lg text-primary tracking-wider">
					Datos del Tomador
				</h3>
				<Separator className="bg-border" />
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label
						htmlFor="policyholderIdentityNumber"
						id="policyholderIdentityNumber-label"
						className="text-sm font-medium"
					>
						Nro. de Documento <span className="text-red-500">*</span>
					</Label>
					<PolicyholderAutocomplete
						value={documentValue}
						results={results}
						isSearching={isSearching}
						disabled={fieldsDisabled}
						onQueryChange={onQueryChange}
						onSelect={fillPolicyholder}
						onCreateNew={(identityNumber) => {
							setValue('policyholderIdentityNumber', identityNumber, {
								shouldValidate: true,
							})
							setValue('policyholderEmail', '', { shouldValidate: false })
							setValue('policyholderName', '', { shouldValidate: false })
							setValue('policyholderLastNames', '', { shouldValidate: false })
							setValue('policyholderPhone', '', { shouldValidate: false })
						}}
					/>
					{errors.policyholderIdentityNumber && (
						<p className="text-xs text-red-500">
							{errors.policyholderIdentityNumber.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="policyholderTypeIdentity" className="text-sm font-medium">
						Tipo de Documento <span className="text-red-500">*</span>
					</Label>
					<Select
						disabled={fieldsDisabled}
						value={typeValue || undefined}
						onValueChange={(value) =>
							setValue('policyholderTypeIdentity', value, {
								shouldValidate: true,
							})
						}
					>
						<SelectTrigger
							id="policyholderTypeIdentity"
							className={
								errors.policyholderTypeIdentity ? 'border-red-500' : ''
							}
						>
							<SelectValue placeholder="Seleccione el tipo de documento" />
						</SelectTrigger>
						<SelectContent>
							{visibleTypes.map((option) => (
								<SelectItem key={option.code} value={option.code}>
									{option.name} ({option.code})
									{option.status ? '' : ' — Inactivo'}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.policyholderTypeIdentity && (
						<p className="text-xs text-red-500">
							{errors.policyholderTypeIdentity.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="policyholderEmail" className="text-sm font-medium">
						Email <span className="text-red-500">*</span>
					</Label>
					<Input
						id="policyholderEmail"
						type="email"
						disabled={fieldsDisabled}
						className={errors.policyholderEmail ? 'border-red-500' : ''}
						{...register('policyholderEmail')}
					/>
					{errors.policyholderEmail && (
						<p className="text-xs text-red-500">
							{errors.policyholderEmail.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="policyholderLastNames" className="text-sm font-medium">
						Apellidos <span className="text-red-500">*</span>
					</Label>
					<Input
						id="policyholderLastNames"
						disabled={fieldsDisabled}
						className={errors.policyholderLastNames ? 'border-red-500' : ''}
						{...register('policyholderLastNames')}
					/>
					{errors.policyholderLastNames && (
						<p className="text-xs text-red-500">
							{errors.policyholderLastNames.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="policyholderName" className="text-sm font-medium">
						Nombres <span className="text-red-500">*</span>
					</Label>
					<Input
						id="policyholderName"
						disabled={fieldsDisabled}
						className={errors.policyholderName ? 'border-red-500' : ''}
						{...register('policyholderName')}
					/>
					{errors.policyholderName && (
						<p className="text-xs text-red-500">
							{errors.policyholderName.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="policyholderPhone" className="text-sm font-medium">
						Teléfono <span className="text-red-500">*</span>
					</Label>
					<Input
						id="policyholderPhone"
						type="tel"
						disabled={fieldsDisabled}
						className={errors.policyholderPhone ? 'border-red-500' : ''}
						{...register('policyholderPhone')}
					/>
					{errors.policyholderPhone && (
						<p className="text-xs text-red-500">
							{errors.policyholderPhone.message}
						</p>
					)}
				</div>
			</div>
		</div>
	)
}
