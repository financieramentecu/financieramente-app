import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { Client } from '@prisma/client'
import {
	businessFormSchema,
	type BusinessFormData,
} from '@/features/negocios/lib/business-form-schemas'
import { createClient } from '@/features/negocios/actions/create-client'
import { updateClient } from '@/features/negocios/actions/update-client'
import { createBusiness } from '@/features/negocios/actions/create-business'
import { useSearchClient } from '@/features/negocios/hooks/use-search-client'
import { useSearchAgents } from '@/features/negocios/hooks/use-search-agents'
import { useProductFilter } from '@/features/negocios/hooks/use-product-filter'
import { useAgentPermissions } from '@/features/negocios/hooks/use-agent-permissions'
import { useBusinessMutation } from '@/features/negocios/hooks/use-business-mutation'
import { UserRole } from '@/features/auth/lib/roles'
import { useBusinessPermissions } from '@/features/negocios/hooks/use-business-permissions'
import type { BusinessFormProps } from '@/features/negocios/types/business.types'

/**
 * Hook principal que coordina toda la lógica del formulario de negocios
 * Inicializa el formulario, maneja la creación de clientes y coordina hooks secundarios
 */
export function useBusinessForm(props: BusinessFormProps) {
	const {
		mode = 'create',
		businessId,
		clientId,
		onSubmit,
		defaultValues,
		currentUser,
		productsOptions,
		businessAgent,
		leadId,
	} = props

	const isEditMode = mode === 'edit'
	const { updateBusiness, isUpdating } = useBusinessMutation()

	const [selectedClient, setSelectedClient] = React.useState<Client | null>(
		null
	)
	const [idSettlementCommission, setIdSettlementCommission] = React.useState<number | null>(null)

	const { handleSearchClient, results: clientResults } = useSearchClient()
	const { handleSearchAgents } = useSearchAgents()

	// Inicializar formulario
	const form = useForm<BusinessFormData>({
		resolver: zodResolver(businessFormSchema),
		defaultValues: {
			email: defaultValues?.email || '',
			name: defaultValues?.name || '',
			lastNames: defaultValues?.lastNames || '',
			phone: defaultValues?.phone || '',
			identityNumber: defaultValues?.identityNumber || '',
			clientOrigin: defaultValues?.clientOrigin || '',
			company: defaultValues?.company || '',
			producto: defaultValues?.producto || '',
			terms: defaultValues?.terms || undefined,
			currency: defaultValues?.currency || '',
			periodicity: defaultValues?.periodicity || '',
			value: defaultValues?.value || undefined,
			agent: defaultValues?.agent || '',
			contract: defaultValues?.contract ?? '',
			numAportes: defaultValues?.numAportes ?? undefined,
		},
	})

	const { handleSubmit, setValue, watch, formState } = form
	const { isSubmitting } = formState

	const selectedCompany = watch('company')
	const selectedProduct = watch('producto')
	const documentValue = watch('identityNumber')

	// Roles que siempre tienen habilitada la búsqueda (sin esperar el documento)
	const isPrivilegedRole =
		currentUser?.role?.code === UserRole.ADMIN ||
		currentUser?.role?.code === UserRole.ASISTENTE_GERENCIA_OPERATIVA

	// Determinar si los campos deben estar bloqueados
	const isBlocked =
		!isPrivilegedRole && (!documentValue || documentValue.length < 5)

	// Usar hook de filtrado de productos
	const { filteredProducts } = useProductFilter({
		productsOptions,
		selectedCompany,
		selectedProduct,
		setValue,
	})

	// Usar hook de permisos de agente
	const { agentsList, setAgentsList, isAgentUser, canSearchAgents } =
		useAgentPermissions({
			currentUser,
			setValue,
			mode,
			businessAgent,
		})

	// Usar hook de permisos centralizado
	const { getFieldPermission, canEditClientInfo } = useBusinessPermissions({
		mode,
		currentUser,
		businessStatus: props.businessStatus,
	})

	// Handler para cuando se selecciona un cliente existente
	const handleClientSelected = React.useCallback((client: Client) => {
		setSelectedClient(client)
	}, [])

	// Handler para cuando se hace clic en "Crear nuevo"
	const handleCreateNew = React.useCallback((_identityNumber: string) => {
		setSelectedClient(null)
	}, [])

	// Handler para búsqueda de agentes
	const handleAgentSearch = React.useCallback(
		async (query: string) => {
			if (!canSearchAgents) {
				return []
			}
			const results = await handleSearchAgents(query, UserRole.AGENTE)
			setAgentsList(results)
			return results
		},
		[canSearchAgents, handleSearchAgents, setAgentsList]
	)

	const handleInvalidSubmit = React.useCallback(() => {
		toast.error('Campos obligatorios incompletos', {
			description:
				'Revisa los campos marcados con asterisco rojo e intenta guardar de nuevo.',
		})
	}, [])

	// Handler para submit del formulario
	const handleFormSubmit = React.useCallback(
		async (data: BusinessFormData) => {
			try {
				// En modo edición, enviar todos los campos que hayan cambiado (o todos los disponibles)
				if (isEditMode && businessId) {
					if (canEditClientInfo && !clientId) {
						toast.error('Error al actualizar cliente', {
							description:
								'No se encontró el cliente asociado al negocio. Recarga la página e intenta de nuevo.',
						})
						return
					}

					if (canEditClientInfo && clientId) {
						const updateResult = await updateClient({
							idClient: clientId,
							name: data.name,
							lastName: data.lastNames,
							email: data.email,
							phone: data.phone,
							identityNumber: data.identityNumber,
							context: 'business-edit',
							businessId,
						})

						if ('error' in updateResult && updateResult.error) {
							toast.error('Error al actualizar cliente', {
								description: updateResult.error,
							})
							return
						}
					}

					const result = await updateBusiness(
						businessId,
						{
							contract: data.contract || undefined,
							idSettlementCommission: idSettlementCommission || undefined,
							idProduct: data.producto ? parseInt(data.producto) : undefined,
							term: data.terms,
							value: data.value,
							idBuyPeriodicity: data.periodicity
								? parseInt(data.periodicity)
								: undefined,
							idCurrency: data.currency ? parseInt(data.currency) : undefined,
							numAportes: data.numAportes,
							...(canEditClientInfo && data.clientOrigin
								? { idClientOrigin: parseInt(data.clientOrigin) }
								: {}),
						},
						canEditClientInfo
							? {
									successTitle: 'Información actualizada exitosamente',
									successDescription:
										'Los datos del cliente y del negocio se guardaron correctamente.',
								}
							: undefined
					)

					if (result) {
						await onSubmit?.(data)
					}
					return
				}

				// --- Modo creación ---
				let clientToUse = selectedClient
				let resolvedClientId = selectedClient?.idClient ?? null

				// Si no hay un cliente seleccionado, significa que es un nuevo cliente
				// y necesitamos crearlo antes de crear el negocio
				if (!resolvedClientId) {
					// Crear el nuevo cliente usando el action
					const createResult = await createClient({
						name: data.name,
						lastName: data.lastNames,
						typeIdentity: 'CC', // Por defecto CC
						identityNumber: data.identityNumber,
						email: data.email,
						phone: data.phone,
						country: 'Colombia',
					})

					if ('error' in createResult) {
						toast.error('Error al crear cliente', {
							description: createResult.error,
						})
						return
					}

					if (createResult.data) {
						clientToUse = createResult.data
						resolvedClientId = createResult.data.idClient
						setSelectedClient(clientToUse)
					} else {
						toast.error('Error al crear cliente', {
							description: 'No se pudo crear el cliente',
						})
						return
					}
				}

				// Si el cliente existe, verificar si fue modificado y actualizarlo
				if (resolvedClientId && clientToUse) {
					const hasChanges =
						clientToUse.name !== data.name ||
						clientToUse.lastName !== data.lastNames ||
						clientToUse.email !== data.email ||
						clientToUse.phone !== data.phone

					if (hasChanges) {
						const updateResult = await updateClient({
							idClient: resolvedClientId,
							name: data.name,
							lastName: data.lastNames,
							email: data.email,
							phone: data.phone,
							context: 'business-create',
						})

						if ('error' in updateResult) {
							toast.error('Error al actualizar cliente', {
								description: updateResult.error,
							})
							return
						}

						if (updateResult.data) {
							clientToUse = updateResult.data
							setSelectedClient(clientToUse)
						}
					}
				}

				// Crear el negocio usando el action createBusiness
				const businessResult = await createBusiness({
					contract:
						data.contract && data.contract.trim().length > 0
							? data.contract.trim()
							: undefined,
					term: data.terms,
					value: data.value,
					idBuyPeriodicity: parseInt(data.periodicity),
					idUser: parseInt(data.agent),
					idClient: resolvedClientId!,
					idProduct: parseInt(data.producto),
					idCurrency: parseInt(data.currency),
					idClientOrigin: parseInt(data.clientOrigin),
					...(leadId ? { idLead: leadId } : {}),
				})

				if ('error' in businessResult) {
					toast.error('Error al crear negocio', {
						description: businessResult.error,
					})
					return
				}

				// Si es exitoso, llamar al onSubmit para que el wrapper maneje el toast y redirect
				await onSubmit?.(data)
			} catch (error) {
				console.error('Error submitting form:', error)
				toast.error('Error al procesar el formulario', {
					description:
						'Ocurrió un error al intentar procesar el formulario. Por favor, intenta de nuevo.',
				})
			}
		},
		[
			selectedClient,
			onSubmit,
			isEditMode,
			businessId,
			clientId,
			updateBusiness,
			idSettlementCommission,
			canEditClientInfo,
			leadId,
		]
	)

	return {
		form,
		isBlocked,
		isSubmitting: isSubmitting || isUpdating,
		isEditMode,
		handleFormSubmit: handleSubmit(
			handleFormSubmit as (data: BusinessFormData) => Promise<void>,
			handleInvalidSubmit
		),
		handleClientSelected,
		handleCreateNew,
		handleSearchClient,
		clientResults,
		filteredProducts,
		agentsList,
		isAgentUser,
		canSearchAgents,
		handleAgentSearch,
		setIdSettlementCommission,
		isPrivilegedRole,
		getFieldPermission,
	}
}
