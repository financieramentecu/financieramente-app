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
import { resolveExistingClient } from '@/features/negocios/actions/resolve-existing-client'
import { useSearchClient } from '@/features/negocios/hooks/use-search-client'
import { useSearchAgents } from '@/features/negocios/hooks/use-search-agents'
import { useProductFilter } from '@/features/negocios/hooks/use-product-filter'
import { useAgentPermissions } from '@/features/negocios/hooks/use-agent-permissions'
import { useBusinessMutation } from '@/features/negocios/hooks/use-business-mutation'
import { UserRole } from '@/features/auth/lib/roles'
import { useBusinessPermissions } from '@/features/negocios/hooks/use-business-permissions'
import type { BusinessFormProps } from '@/features/negocios/types/business.types'

/**
 * D5: state raised when the exact-email resolution finds a client whose
 * stored `identityNumber` differs from the one typed on the form. The
 * submit is interrupted until `resolveIdentityConflict(choice)` is called.
 */
export type IdentityConflict = {
	client: Client
	storedIdentityNumber: string
	typedIdentityNumber: string
	error?: string
} | null

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
	// D5: pending identity-document conflict + the form data captured when the
	// submit was interrupted, so `resolveIdentityConflict` can resume it.
	const [identityConflict, setIdentityConflict] =
		React.useState<IdentityConflict>(null)
	const [pendingSubmitData, setPendingSubmitData] =
		React.useState<BusinessFormData | null>(null)

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

	// Determinar si los campos de contacto (email/name/lastNames/phone/clientOrigin)
	// y el selector de agente deben estar bloqueados. Es la única derivación de
	// este flag (D3): leadId nunca se bloquea, edit mode nunca se bloquea, y los
	// roles privilegiados nunca se bloquean en el flujo manual.
	const isBlocked =
		!isEditMode &&
		!isPrivilegedRole &&
		!leadId &&
		(!documentValue || documentValue.length < 5)

	// Determinar si el campo de contrato debe estar bloqueado (D4). A diferencia
	// de `isBlocked`, aplica el gate incluso a roles privilegiados en el flujo
	// manual — mantiene el comportamiento actual de `isContractDisabled`.
	const isContractBlocked =
		!isEditMode && !leadId && (!documentValue || documentValue.length < 5)

	// Usar hook de filtrado de productos
	const { filteredProducts } = useProductFilter({
		productsOptions,
		selectedCompany,
		selectedProduct,
		setValue,
	})

	// Usar hook de permisos de agente
	const {
		agentsList,
		setAgentsList,
		isAgentUser,
		canSearchAgents,
		isLeadOwnerLocked,
	} = useAgentPermissions({
		currentUser,
		setValue,
		mode,
		businessAgent,
		leadId,
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

	// Completa el flujo de creación una vez que el cliente a usar está
	// decidido (creado, resuelto por D1/D7, o resuelto tras la decisión D5):
	// sincroniza cambios de contacto vía `hasChanges` → `updateClient`, crea
	// el negocio y llama a `onSubmit`. Compartido por el submit normal y por
	// `resolveIdentityConflict` (D5 resume).
	const finishCreateSubmit = React.useCallback(
		async (data: BusinessFormData, client: Client) => {
			let clientToUse = client
			const resolvedClientId = client.idClient

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
				idClient: resolvedClientId,
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
		},
		[leadId, onSubmit]
	)

	// D5: el usuario decidió cómo resolver el conflicto de documento entre el
	// cliente encontrado por email y el documento tipeado. Retoma el mismo
	// submit que quedó interrumpido — el usuario nunca re-tipea ni reenvía.
	const resolveIdentityConflict = React.useCallback(
		async (choice: 'update' | 'keep') => {
			if (!identityConflict || !pendingSubmitData) return

			let clientToUse = identityConflict.client

			if (choice === 'update') {
				const updateResult = await updateClient({
					idClient: identityConflict.client.idClient,
					identityNumber: identityConflict.typedIdentityNumber,
					context: 'business-create',
				})

				if ('error' in updateResult && updateResult.error) {
					setIdentityConflict((prev) =>
						prev ? { ...prev, error: updateResult.error } : prev
					)
					return
				}

				if (updateResult.data) {
					clientToUse = updateResult.data
				}
			}

			setSelectedClient(clientToUse)
			const data = pendingSubmitData
			setIdentityConflict(null)
			setPendingSubmitData(null)
			await finishCreateSubmit(data, clientToUse)
		},
		[identityConflict, pendingSubmitData, finishCreateSubmit]
	)

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

				// D2: solo se intenta resolver un cliente existente cuando la
				// creación viene de la conversión de un lead — el flujo manual
				// (ClientAutocomplete) ya cubre la deduplicación por su cuenta.
				if (!resolvedClientId && leadId) {
					const resolveResult = await resolveExistingClient({
						typeIdentity: 'CC',
						identityNumber: data.identityNumber,
						email: data.email,
						leadId,
					})

					// D6: un error de resolución nunca bloquea el submit — se cae al
					// flujo de creación actual como si no hubiera match.
					if (!('error' in resolveResult) && resolveResult.data) {
						const resolution = resolveResult.data

						// D5: un match por email con documento distinto es una decisión
						// del usuario, no una decisión silenciosa del sistema.
						if (
							resolution.source === 'email' &&
							resolution.client.identityNumber !== data.identityNumber
						) {
							setIdentityConflict({
								client: resolution.client,
								storedIdentityNumber: resolution.client.identityNumber,
								typedIdentityNumber: data.identityNumber,
							})
							setPendingSubmitData(data)
							return
						}

						clientToUse = resolution.client
						resolvedClientId = resolution.client.idClient
						setSelectedClient(clientToUse)
					}
				}

				// Si no hay un cliente resuelto, significa que es un nuevo cliente
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

				await finishCreateSubmit(data, clientToUse!)
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
			finishCreateSubmit,
		]
	)

	return {
		form,
		isBlocked,
		isContractBlocked,
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
		isLeadOwnerLocked,
		getFieldPermission,
		identityConflict,
		resolveIdentityConflict,
	}
}
