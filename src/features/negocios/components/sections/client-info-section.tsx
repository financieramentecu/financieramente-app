'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
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
import { ClientAutocomplete } from '@/features/negocios/components/fields/client-autocomplete'
import { ClientIdentityConflictAlert } from '@/features/negocios/components/sections/client-identity-conflict-alert'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import type { Client } from '@prisma/client'
import type { IdentityConflict } from '@/features/negocios/hooks/use-business-form'

import type {
	BusinessFormField,
	FieldPermission,
} from '@/features/negocios/hooks/use-business-permissions'

export interface ClientInfoSectionProps {
	form: UseFormReturn<BusinessFormData>
	clientOriginsOptions: { value: string; label: string }[]
	clientResults: Client[]
	onSearchClient: (query: string) => Promise<Client[]>
	onClientSelected: (client: Client) => void
	isEditMode?: boolean
	isBlocked: boolean
	/**
	 * True when the form was opened as a lead conversion (`leadId` present).
	 * Contact fields are already prefilled from the lead — "Crear nuevo
	 * cliente" (triggered when the typed document has no match) MUST NOT
	 * wipe them, unlike the manual creation flow where clearing is correct
	 * (there is no prior data to protect).
	 */
	isLeadConversion?: boolean
	getFieldPermission: (field: BusinessFormField) => FieldPermission
	/** D5: identity-document conflict raised by the lead-conversion client resolution. */
	identityConflict?: IdentityConflict
	onResolveIdentityConflict?: (choice: 'update' | 'keep') => void
	/** From `canRoleEditClientInfo(currentUser.role.code)` — gates "Actualizar documento". */
	canUpdateDocument?: boolean
	isSubmitting?: boolean
}

export function ClientInfoSection({
	form,
	clientOriginsOptions,
	clientResults,
	onSearchClient,
	onClientSelected,
	isEditMode = false,
	isBlocked,
	isLeadConversion = false,
	getFieldPermission,
	identityConflict,
	onResolveIdentityConflict,
	canUpdateDocument = false,
	isSubmitting = false,
}: ClientInfoSectionProps) {
	const {
		register,
		setValue,
		watch,
		formState: { errors },
	} = form

	const documentValue = watch('identityNumber')
	const emailValue = watch('email')
	const nameValue = watch('name')
	const lastNamesValue = watch('lastNames')
	const phoneValue = watch('phone')

	// Referencia para el campo email (para mover el foco)
	const emailInputRef = React.useRef<HTMLInputElement>(null)

	// Registrar los campos correctamente
	const emailRegister = register('email')
	const nameRegister = register('name')
	const lastNamesRegister = register('lastNames')
	const phoneRegister = register('phone')

	// Combinar el ref de react-hook-form con nuestro ref personalizado para email
	const emailRefCallback = React.useCallback(
		(element: HTMLInputElement | null) => {
			emailRegister.ref(element)
			emailInputRef.current = element
		},
		[emailRegister]
	)

	// Handler para cuando se selecciona un documento
	const handleIdentityNumberChange = React.useCallback(
		(identityNumber: string) => {
			setValue('identityNumber', identityNumber, { shouldValidate: true })

			// Si se seleccionó un cliente existente, autocompletar campos
			if (identityNumber && clientResults) {
				const selectedClient = clientResults.find(
					(c) => c.identityNumber === identityNumber
				)
				if (selectedClient) {
					setValue('email', selectedClient.email || '', {
						shouldValidate: true,
					})
					setValue('name', selectedClient.name, { shouldValidate: true })
					setValue('lastNames', selectedClient.lastName || '', {
						shouldValidate: true,
					})
					if (selectedClient.phone) {
						setValue('phone', selectedClient.phone, { shouldValidate: true })
					}
					onClientSelected(selectedClient)
				}
			}
		},
		[setValue, clientResults, onClientSelected]
	)

	// Handler para cuando se hace clic en "Crear nuevo"
	const handleCreateNew = React.useCallback(
		(identityNumber: string) => {
			setValue('identityNumber', identityNumber, { shouldValidate: true })

			// En conversión de lead los campos de contacto ya vienen prefilled
			// desde el lead — "Crear nuevo" no debe borrarlos, solo confirma que
			// el documento tipeado no coincide con ningún cliente existente. En
			// el flujo manual sí se limpian: no hay datos previos que proteger.
			if (!isLeadConversion) {
				setValue('email', '', { shouldValidate: false })
				setValue('name', '', { shouldValidate: false })
				setValue('lastNames', '', { shouldValidate: false })
				setValue('phone', '', { shouldValidate: false })
			}

			// Mover el foco al campo email
			setTimeout(() => {
				emailInputRef.current?.focus()
			}, 100)
		},
		[setValue, isLeadConversion]
	)

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<h3 className="font-bold text-lg text-primary tracking-wider">
					Información básica y general
				</h3>
				<Separator className="bg-border" />
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label
						htmlFor="numeroDocumento"
						id="numeroDocumento-label"
						className="text-sm font-medium"
					>
						No. Documento <span className="text-red-500">*</span>
					</Label>
					{isEditMode ? (
						<Input
							id="numeroDocumento"
							value={documentValue}
							disabled={getFieldPermission('identityNumber').disabled}
							onChange={(e) =>
								setValue('identityNumber', e.target.value, {
									shouldValidate: true,
								})
							}
							placeholder="Número de documento"
							className={
								getFieldPermission('identityNumber').disabled
									? 'bg-muted'
									: errors.identityNumber
										? 'border-red-500'
										: ''
							}
						/>
					) : (
						<ClientAutocomplete
							value={documentValue}
							onChange={handleIdentityNumberChange}
							users={clientResults}
							onSearch={onSearchClient}
							placeholder="Buscar o crear documento..."
							onCreateNew={handleCreateNew}
							onFocusNextField={() => emailInputRef.current?.focus()}
							aria-labelledby="numeroDocumento-label"
							className={errors.identityNumber ? 'border-red-500' : ''}
						/>
					)}
					{errors.identityNumber && (
						<p className="text-xs text-red-500">
							{errors.identityNumber.message}
						</p>
					)}
					{isBlocked &&
						!errors.identityNumber &&
						documentValue &&
						documentValue.length > 0 &&
						documentValue.length < 5 && (
							<p className="text-xs text-amber-600">
								El documento debe tener al menos 5 caracteres para habilitar los
								campos
							</p>
						)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="email" className="text-sm font-medium">
						Email <span className="text-red-500">*</span>
					</Label>
					<Input
						id="email"
						name={emailRegister.name}
						value={emailValue}
						onChange={(e) => {
							emailRegister.onChange(e)
							setValue('email', e.target.value, { shouldValidate: true })
						}}
						onBlur={emailRegister.onBlur}
						ref={emailRefCallback}
						placeholder="email@gmail.com"
						disabled={getFieldPermission('email').disabled || isBlocked}
						className={errors.email ? 'border-red-500' : ''}
					/>
					{errors.email && (
						<p className="text-xs text-red-500">{errors.email.message}</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="lastNames" className="text-sm font-medium">
						Apellidos <span className="text-red-500">*</span>
					</Label>
					<Input
						id="lastNames"
						name={lastNamesRegister.name}
						value={lastNamesValue}
						onChange={(e) => {
							lastNamesRegister.onChange(e)
							setValue('lastNames', e.target.value, { shouldValidate: true })
						}}
						onBlur={lastNamesRegister.onBlur}
						ref={lastNamesRegister.ref}
						placeholder="Apellidos"
						disabled={getFieldPermission('lastNames').disabled || isBlocked}
						className={errors.lastNames ? 'border-red-500' : ''}
					/>
					{errors.lastNames && (
						<p className="text-xs text-red-500">{errors.lastNames.message}</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="name" className="text-sm font-medium">
						Nombres <span className="text-red-500">*</span>
					</Label>
					<Input
						id="name"
						name={nameRegister.name}
						value={nameValue}
						onChange={(e) => {
							nameRegister.onChange(e)
							setValue('name', e.target.value, { shouldValidate: true })
						}}
						onBlur={nameRegister.onBlur}
						ref={nameRegister.ref}
						placeholder="Nombres"
						disabled={getFieldPermission('name').disabled || isBlocked}
						className={errors.name ? 'border-red-500' : ''}
					/>
					{errors.name && (
						<p className="text-xs text-red-500">{errors.name.message}</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="phone" className="text-sm font-medium">
						Teléfono <span className="text-red-500">*</span>
					</Label>
					<Input
						id="phone"
						name={phoneRegister.name}
						value={phoneValue}
						onChange={(e) => {
							phoneRegister.onChange(e)
							setValue('phone', e.target.value, { shouldValidate: true })
						}}
						onBlur={phoneRegister.onBlur}
						ref={phoneRegister.ref}
						placeholder="+57 XXXXXXXXXX"
						disabled={getFieldPermission('phone').disabled || isBlocked}
						type="tel"
						className={errors.phone ? 'border-red-500' : ''}
					/>
					{errors.phone && (
						<p className="text-xs text-red-500">{errors.phone.message}</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="clientOrigin" className="text-sm font-medium">
						Origen del Cliente <span className="text-red-500">*</span>
					</Label>
					<Select
						disabled={getFieldPermission('clientOrigin').disabled || isBlocked}
						value={watch('clientOrigin')}
						onValueChange={(value) =>
							setValue('clientOrigin', value, { shouldValidate: true })
						}
					>
						<SelectTrigger
							id="clientOrigin"
							className={errors.clientOrigin ? 'border-red-500' : ''}
						>
							<SelectValue placeholder="Seleccione el origen del cliente" />
						</SelectTrigger>
						<SelectContent>
							{clientOriginsOptions.map((origin) => (
								<SelectItem key={origin.value} value={origin.value}>
									{origin.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.clientOrigin && (
						<p className="text-xs text-red-500">
							{errors.clientOrigin.message}
						</p>
					)}
				</div>

			</div>

			{identityConflict && (
				<ClientIdentityConflictAlert
					storedIdentityNumber={identityConflict.storedIdentityNumber}
					typedIdentityNumber={identityConflict.typedIdentityNumber}
					canUpdateDocument={canUpdateDocument}
					isSubmitting={isSubmitting}
					error={identityConflict.error}
					onKeep={() => onResolveIdentityConflict?.('keep')}
					onUpdate={() => onResolveIdentityConflict?.('update')}
				/>
			)}
		</div>
	)
}
