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
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import { Client } from '@prisma/client'

export interface ClientInfoSectionProps {
	form: UseFormReturn<BusinessFormData>
	clientOriginsOptions: { value: string; label: string }[]
	clientResults: Client[]
	onSearchClient: (query: string) => Promise<Client[]>
	onClientSelected: (client: Client) => void
	isEditMode?: boolean
}

export function ClientInfoSection({
	form,
	clientOriginsOptions,
	clientResults,
	onSearchClient,
	onClientSelected,
	isEditMode = false,
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
	const contractValue = watch('contract')

	// En modo edición, todos los campos de cliente están deshabilitados
	// En modo creación, se habilitan cuando el documento tiene 5+ caracteres
	const isBlocked = isEditMode || !documentValue || documentValue.length < 5
	// El campo de contrato está habilitado en modo edición pero sigue las reglas de isBlocked en creación
	const isContractDisabled = !isEditMode && isBlocked

	// Referencia para el campo email (para mover el foco)
	const emailInputRef = React.useRef<HTMLInputElement>(null)

	// Registrar los campos correctamente
	const emailRegister = register('email')
	const nameRegister = register('name')
	const lastNamesRegister = register('lastNames')
	const phoneRegister = register('phone')
	const contractRegister = register('contract')

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

			// Limpiar los campos de información del cliente cuando se crea un nuevo usuario
			setValue('email', '', { shouldValidate: false })
			setValue('name', '', { shouldValidate: false })
			setValue('lastNames', '', { shouldValidate: false })
			setValue('phone', '', { shouldValidate: false })

			// Mover el foco al campo email
			setTimeout(() => {
				emailInputRef.current?.focus()
			}, 100)
		},
		[setValue]
	)

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<h3 className="font-bold text-sm text-[#00505C]">
					Información básica y general del cliente
				</h3>
				<Separator className="bg-gray-300" />
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
							disabled
							className="bg-muted"
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
					{!isEditMode &&
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
						disabled={isBlocked}
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
						disabled={isBlocked}
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
						disabled={isBlocked}
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
						disabled={isBlocked}
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
						disabled={isBlocked}
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

				<div className="space-y-2">
					<Label htmlFor="contract" className="text-sm font-medium">
						Nro. Contrato{' '}
						{isEditMode && <span className="text-red-500">*</span>}
					</Label>
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
						disabled={isContractDisabled}
						className={errors.contract ? 'border-red-500' : ''}
					/>
					{errors.contract && (
						<p className="text-xs text-red-500">{errors.contract.message}</p>
					)}
					{isEditMode && (
						<p className="text-xs text-muted-foreground">
							Ingrese el número de contrato para cambiar el estado a Emitido
						</p>
					)}
				</div>
			</div>
		</div>
	)
}
