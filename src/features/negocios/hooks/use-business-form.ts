import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Client } from '@prisma/client'
import {
	businessFormSchema,
	type BusinessFormData,
} from '@/features/negocios/lib/business-form-schemas'
import { createClient } from '@/features/negocios/actions/create-client'
import { useSearchClient } from '@/features/negocios/hooks/useSearchClient'
import { useSearchAgents } from '@/features/negocios/hooks/useSearchAgents'
import { useProductFilter } from '@/features/negocios/hooks/use-product-filter'
import { useAgentPermissions } from '@/features/negocios/hooks/use-agent-permissions'
import { UserRole } from '@/lib/auth/roles'
import type { BusinessFormProps } from '@/features/negocios/types/business.types'

/**
 * Hook principal que coordina toda la lógica del formulario de negocios
 * Inicializa el formulario, maneja la creación de clientes y coordina hooks secundarios
 */
export function useBusinessForm(props: BusinessFormProps) {
	const { onSubmit, defaultValues, currentUser, productsOptions } = props

	const [selectedClientId, setSelectedClientId] = React.useState<number | null>(
		null
	)

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
			compania: defaultValues?.compania || '',
			producto: defaultValues?.producto || '',
			terms: defaultValues?.terms || undefined,
			currency: defaultValues?.currency || '',
			periodicity: defaultValues?.periodicity || '',
			value: defaultValues?.value || undefined,
			agent: defaultValues?.agent || '',
		},
	})

	const { handleSubmit, setValue, watch, formState } = form
	const { isSubmitting } = formState

	const selectedCompany = watch('compania')
	const selectedProduct = watch('producto')
	const documentValue = watch('identityNumber')

	// Determinar si los campos deben estar bloqueados
	const isBlocked = !documentValue || documentValue.length < 5

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
		})

	// Handler para cuando se selecciona un cliente existente
	const handleClientSelected = React.useCallback((client: Client) => {
		setSelectedClientId(client.idClient)
	}, [])

	// Handler para cuando se hace clic en "Crear nuevo"
	const handleCreateNew = React.useCallback((_identityNumber: string) => {
		setSelectedClientId(null)
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

	// Handler para submit del formulario
	const handleFormSubmit = React.useCallback(
		async (data: BusinessFormData) => {
			try {
				let clientId = selectedClientId

				// Si no hay un cliente seleccionado, significa que es un nuevo cliente
				// y necesitamos crearlo antes de crear el negocio
				if (!clientId) {
					// Verificar si el cliente ya existe en la base de datos
					const existingClient = clientResults.find(
						(c) => c.identityNumber === data.identityNumber
					)

					if (!existingClient) {
						// Crear el nuevo cliente usando el action
						const createResult = await createClient({
							name: data.name,
							lastName: data.lastNames,
							typeIdentity: 'CC', // Por defecto CC
							identityNumber: data.identityNumber,
							idClientOrigin: parseInt(data.clientOrigin),
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
							clientId = createResult.data.idClient
							setSelectedClientId(clientId)
						} else {
							toast.error('Error al crear cliente', {
								description: 'No se pudo crear el cliente',
							})
							return
						}
					} else {
						clientId = existingClient.idClient
						setSelectedClientId(clientId)
					}
				}

				// Ahora podemos crear el negocio con el clientId
				await onSubmit?.(data)
			} catch (error) {
				console.error('Error submitting form:', error)
				toast.error('Error al procesar el formulario', {
					description:
						'Ocurrió un error al intentar procesar el formulario. Por favor, intenta de nuevo.',
				})
			}
		},
		[selectedClientId, clientResults, onSubmit]
	)

	return {
		form,
		isBlocked,
		isSubmitting,
		handleFormSubmit: handleSubmit(handleFormSubmit),
		handleClientSelected,
		handleCreateNew,
		handleSearchClient,
		clientResults,
		filteredProducts,
		agentsList,
		isAgentUser,
		canSearchAgents,
		handleAgentSearch,
	}
}
