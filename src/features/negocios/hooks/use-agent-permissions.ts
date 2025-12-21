import * as React from 'react'
import { UseFormSetValue } from 'react-hook-form'
import { UserRole } from '@/lib/auth/roles'
import { UserWithRole } from '@/features/negocios/types/business.types'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

interface UseAgentPermissionsOptions {
	currentUser: UserWithRole | null
	setValue: UseFormSetValue<BusinessFormData>
}

/**
 * Hook para manejar permisos y roles de usuario relacionados con agentes
 * Centraliza la lógica de autorización y pre-carga el agente actual si es AGENTE
 */
export function useAgentPermissions({
	currentUser,
	setValue,
}: UseAgentPermissionsOptions) {
	const [agentsList, setAgentsList] = React.useState<UserWithRole[]>([])

	// Determinar si el usuario es AGENTE
	const isAgentUser = currentUser?.role?.code === UserRole.AGENTE

	// Determinar si el usuario puede buscar agentes
	const canSearchAgents =
		currentUser?.role?.code === UserRole.ANALISTA_SOPORTE ||
		currentUser?.role?.code === UserRole.ASISTENTE_GERENCIA_OPERATIVA

	// Pre-cargar el usuario actual si es AGENTE
	React.useEffect(() => {
		if (isAgentUser && currentUser) {
			setAgentsList([currentUser])
			setValue('agent', currentUser.idUser.toString(), {
				shouldValidate: true,
			})
		}
	}, [isAgentUser, currentUser, setValue])

	return {
		agentsList,
		setAgentsList,
		isAgentUser,
		canSearchAgents,
	}
}
