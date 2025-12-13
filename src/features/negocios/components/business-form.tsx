'use client'

import * as React from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/features/shared/ui/button'
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
import {
	businessFormSchema,
	type BusinessFormData,
} from '@/features/negocios/lib/business-form-schemas'
import { ClientAutocomplete } from '@/features/negocios/components/client-autocomplete'
import {
	AgentAutocomplete,
	type Agent,
} from '@/features/shared/ui/agent-autocomplete'
import { useSearchClient } from '@/features/negocios/hooks/useSearchClient'
import { Client } from '@prisma/client'
// import { toast } from 'sonner'

export interface BusinessFormProps {
	onSubmit?: (data: BusinessFormData) => void | Promise<void>
	onCancel?: () => void
	defaultValues?: Partial<BusinessFormData>
	clients?: Client[]
	agents?: Agent[]
	onUserCreated?: (documento: string) => void | Promise<void>
	companiesOptions: { value: string; label: string }[]
	productsOptions?: { value: string; label: string; companyId: string }[]
	periodicitiesOptions: { value: string; label: string }[]
	currenciesOptions: { value: string; label: string }[]
}

export const BusinessForm = React.forwardRef<
	HTMLFormElement,
	BusinessFormProps
>(
	(
		{
			onSubmit,
			onCancel,
			defaultValues,
			clients,
			agents,
			onUserCreated,
			companiesOptions,
			productsOptions: providedProducts,
			periodicitiesOptions,
			currenciesOptions,
		},
		ref
	) => {
		const [productsOptions, setProductsOptions] = React.useState<
			{ value: string; label: string; companyId: string }[]
		>(providedProducts || [])
		const [agentsList, setAgentsList] = React.useState<Agent[]>(agents || [])

		const {
			handleSearchClient,
			results: clientResults,
			state: clientState,
		} = useSearchClient()

		const {
			register,
			handleSubmit,
			setValue,
			watch,
			reset,
			formState: { errors, isSubmitting },
		} = useForm<BusinessFormData>({
			resolver: zodResolver(businessFormSchema),
			defaultValues: {
				email: defaultValues?.email || '',
				name: defaultValues?.name || '',
				lastNames: defaultValues?.lastNames || '',
				phone: defaultValues?.phone || '',
				identityNumber: defaultValues?.identityNumber || '',
				compania: defaultValues?.compania || '',
				producto: defaultValues?.producto || '',
				terms: defaultValues?.terms || undefined,
				currency: defaultValues?.currency || '',
				periodicity: defaultValues?.periodicity || '',
				value: defaultValues?.value || undefined,
				agent: defaultValues?.agent || '',
			},
		})

		const selectedCompany = watch('compania')
		const selectedProduct = watch('producto')

		const filteredProducts = React.useMemo(() => {
			if (!selectedCompany) {
				return productsOptions
			}
			return productsOptions.filter(
				(product) => product.companyId === selectedCompany
			)
		}, [productsOptions, selectedCompany])

		React.useEffect(() => {
			if (
				selectedProduct &&
				!filteredProducts.some((product) => product.value === selectedProduct)
			) {
				setValue('producto', '')
			}
		}, [filteredProducts, selectedProduct, setValue])

		// Observar cambios en numeroDocumento
		const documentValue = watch('identityNumber')

		React.useEffect(() => {
			if (Array.isArray(agents) && agents.length > 0) {
				setAgentsList(agents)
			}
		}, [agents])

		// Determinar si los campos deben estar bloqueados
		const isBlocked = !documentValue || documentValue.length < 5

		// Handler para cuando se selecciona un documento
		const handleIdentityNumberClientChange = (identityClient: string) => {
			setValue('identityNumber', identityClient, { shouldValidate: true })

			// Si se seleccionó un usuario existente, autocompletar campos
			if (identityClient && clientResults) {
				const selectedClient = clientResults.find(
					(c) => c.identityNumber === identityClient
				)
				if (selectedClient) {
					setValue('email', selectedClient.email || '')
					setValue('name', selectedClient.name)
					setValue('lastNames', selectedClient.lastName || '')
					if (selectedClient.phone) {
						setValue('phone', selectedClient.phone)
					}
				}
			}
		}

		// Handler para crear nuevo usuario
		const handleCreateUser = async (identityClient: string) => {
			// Asegurar explícitamente que el documento se establezca para desbloquear campos
			// Esto es necesario porque el onChange puede no haber actualizado el estado aún
			setValue('identityNumber', identityClient, { shouldValidate: true })

			// Limpiar los campos de información del cliente cuando se crea un nuevo usuario
			// para evitar que se muestren valores por defecto
			setValue('email', '')
			setValue('name', '')
			setValue('lastNames', '')
			setValue('phone', '')

			// Notificar que se está creando un nuevo usuario
			if (onUserCreated) {
				await onUserCreated(identityClient)
			}
		}

		const handleFormSubmit = async (data: BusinessFormData) => {
			try {
				await onSubmit?.(data)
			} catch (error) {
				console.error('Error submitting form:', error)
			}
		}

		return (
			<div className="max-w-4xl mx-auto p-6 bg-white">
				{/* Header */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
					{/* Logo Financiera mente */}
					<div className="flex items-center gap-3">
						<Image
							src="/logos/logo-financiera.svg"
							alt="Financiera mente"
							width={140}
							height={35}
							className="h-auto w-auto"
						/>
					</div>

					{/* Banner con Isologo */}
					<div className="bg-[#00505C] w-full sm:w-auto px-4 sm:px-8 py-4 rounded-lg flex items-center gap-4 sm:gap-6">
						<div className="w-1/2 sm:w-auto flex items-center justify-center">
							<Image
								src="/logos/isologo.svg"
								alt="Isologo"
								width={120}
								height={120}
								className="w-full sm:w-24 sm:h-24 h-auto object-contain"
							/>
						</div>
						<div className="flex-1 flex flex-col">
							<h1 className="text-[#83D874] font-bold text-base sm:text-lg">
								Formulario único de inscripción Nacional
							</h1>
							<p className="text-[#6BCA6F] text-sm sm:text-base">
								Formulario único de inscripción Nacional
							</p>
						</div>
					</div>
				</div>

				<form
					ref={ref}
					onSubmit={handleSubmit(handleFormSubmit)}
					className="space-y-8"
				>
					{/* Sección 1: Información básica y general del cliente */}
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
								<ClientAutocomplete
									value={documentValue}
									onChange={handleIdentityNumberClientChange}
									users={clientResults}
									onSearch={handleSearchClient}
									placeholder="Buscar o crear documento..."
									onCreateNew={handleCreateUser}
									aria-labelledby="numeroDocumento-label"
									className={errors.identityNumber ? 'border-red-500' : ''}
								/>
								{errors.identityNumber && (
									<p className="text-xs text-red-500">
										{errors.identityNumber.message}
									</p>
								)}
								{!errors.identityNumber &&
									documentValue &&
									documentValue.length > 0 &&
									documentValue.length < 5 && (
										<p className="text-xs text-amber-600">
											El documento debe tener al menos 5 caracteres para
											habilitar los campos
										</p>
									)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="email" className="text-sm font-medium">
									Email <span className="text-red-500">*</span>
								</Label>
								<Input
									id="email"
									{...register('email')}
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
									{...register('lastNames')}
									placeholder="Apellidos"
									disabled={isBlocked}
									className={errors.lastNames ? 'border-red-500' : ''}
								/>
								{errors.lastNames && (
									<p className="text-xs text-red-500">
										{errors.lastNames.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="name" className="text-sm font-medium">
									Nombres <span className="text-red-500">*</span>
								</Label>
								<Input
									id="name"
									{...register('name')}
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
									Contacto
								</Label>
								<Input
									id="phone"
									{...register('phone')}
									placeholder="XXX XXX X"
									disabled={isBlocked}
									className={errors.phone ? 'border-red-500' : ''}
								/>
								{errors.phone && (
									<p className="text-xs text-red-500">{errors.phone.message}</p>
								)}
							</div>
						</div>
					</div>

					{/* Sección 2: Información del producto */}
					<div className="space-y-4">
						<div className="space-y-2">
							<h3 className="font-bold text-sm text-[#00505C]">
								Información del producto
							</h3>
							<Separator className="bg-gray-300" />
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="compania" className="text-sm font-medium">
									Compañía
								</Label>
								<Select
									disabled={isBlocked}
									value={selectedCompany || ''}
									onValueChange={(value) => {
										setValue('compania', value, { shouldValidate: true })
										setValue('producto', '')
									}}
								>
									<SelectTrigger
										id="compania"
										className={errors.compania ? 'border-red-500' : ''}
									>
										<SelectValue placeholder="Seleccione una compañía" />
									</SelectTrigger>
									<SelectContent>
										{companiesOptions.map((company) => (
											<SelectItem key={company.value} value={company.value}>
												{company.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{errors.compania && (
									<p className="text-xs text-red-500">
										{errors.compania.message}
									</p>
								)}
								<p className="text-xs text-gray-500">
									Si estas registrado a un negocio internacional elige el nombre
									del producto...
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="producto" className="text-sm font-medium">
									Producto
								</Label>
								<Select
									disabled={isBlocked || filteredProducts.length === 0}
									value={selectedProduct || ''}
									onValueChange={(value) =>
										setValue('producto', value, { shouldValidate: true })
									}
								>
									<SelectTrigger
										id="producto"
										className={errors.producto ? 'border-red-500' : ''}
									>
										<SelectValue placeholder="Seleccione un producto" />
									</SelectTrigger>
									<SelectContent>
										{filteredProducts.map((product) => (
											<SelectItem key={product.value} value={product.value}>
												{product.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{errors.producto && (
									<p className="text-xs text-red-500">
										{errors.producto.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="plazo" className="text-sm font-medium">
									Plazo
								</Label>
								<Input
									id="terms"
									type="number"
									{...register('terms', { valueAsNumber: true })}
									placeholder="10"
									disabled={isBlocked}
									className={errors.terms ? 'border-red-500' : ''}
								/>
								{errors.terms && (
									<p className="text-xs text-red-500">{errors.terms.message}</p>
								)}
							</div>
						</div>
					</div>

					{/* Sección 3: Información del negocio */}
					<div className="space-y-4">
						<div className="space-y-2">
							<h3 className="font-bold text-sm text-[#00505C]">
								Información del negocio
							</h3>
							<Separator className="bg-gray-300" />
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="currency" className="text-sm font-medium">
									Moneda
								</Label>
								<Select
									disabled={isBlocked}
									value={watch('currency')}
									onValueChange={(value) =>
										setValue('currency', value, { shouldValidate: true })
									}
								>
									<SelectTrigger
										id="currency"
										className={errors.currency ? 'border-red-500' : ''}
									>
										<SelectValue placeholder="Seleccione una moneda" />
									</SelectTrigger>
									<SelectContent>
										{currenciesOptions.map((currency) => (
											<SelectItem key={currency.value} value={currency.value}>
												{currency.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{errors.currency && (
									<p className="text-xs text-red-500">
										{errors.currency.message}
									</p>
								)}

								<div className="mt-2">
									<p className="text-sm font-medium mb-2">Valor del negocio</p>
									<div className="text-xs text-gray-500 space-y-1">
										<p>1. Si el negocio es Crea Patrimonio de Skandia....</p>
										<p>2. Si tu cliente toma......</p>
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="perioricidad" className="text-sm font-medium">
									Periodicidad
								</Label>
								<Select
									disabled={isBlocked}
									value={watch('periodicity')}
									onValueChange={(value) =>
										setValue('periodicity', value, { shouldValidate: true })
									}
								>
									<SelectTrigger
										id="periodicity"
										className={errors.periodicity ? 'border-red-500' : ''}
									>
										<SelectValue placeholder="Seleccione periodicidad" />
									</SelectTrigger>
									<SelectContent>
										{periodicitiesOptions.map((periodicity) => (
											<SelectItem
												key={periodicity.value}
												value={periodicity.value}
											>
												{periodicity.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{errors.periodicity && (
									<p className="text-xs text-red-500">
										{errors.periodicity.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="valor" className="text-sm font-medium">
									Valor
								</Label>
								<Input
									id="valor"
									type="number"
									step="0.01"
									{...register('value', { valueAsNumber: true })}
									placeholder="0.00"
									disabled={isBlocked}
									className={errors.value ? 'border-red-500' : ''}
								/>
								{errors.value && (
									<p className="text-xs text-red-500">
										{errors.value?.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="agent"
									id="agent-label"
									className="text-sm font-medium"
								>
									Agente
								</Label>
								<AgentAutocomplete
									value={watch('agent')}
									onChange={(value) =>
										setValue('agent', value, { shouldValidate: true })
									}
									agents={agentsList}
									placeholder="Buscar agente..."
									aria-labelledby="agent-label"
									disabled={isBlocked}
									className={errors.agent ? 'border-red-500' : ''}
								/>
								{errors.agent && (
									<p className="text-xs text-red-500">{errors.agent.message}</p>
								)}
							</div>
						</div>
					</div>

					{/* Botones */}
					<div className="flex justify-end gap-3 pt-4 border-t">
						<Button
							type="button"
							variant="ghost"
							onClick={onCancel}
							disabled={isSubmitting}
							className="text-[#00505C] hover:text-[#00505C] hover:bg-gray-100"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || isBlocked}
							className="bg-[#00505C] hover:bg-[#003d47] text-white"
						>
							{isSubmitting ? 'Guardando...' : 'Aceptar y Guardar'}
						</Button>
					</div>
				</form>
			</div>
		)
	}
)

BusinessForm.displayName = 'BusinessForm'
