import * as React from 'react'
import { UseFormSetValue } from 'react-hook-form'
import { UserRole } from '@/features/auth/lib/roles'
import { UserWithRole } from '@/features/negocios/types/business.types'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import type { AgentInfo } from '@/features/negocios/types/business-entity.types'

interface UseAgentPermissionsOptions {
	currentUser: UserWithRole | null
	setValue: UseFormSetValue<BusinessFormData>
	mode?: 'create' | 'edit'
	businessAgent?: AgentInfo
	/**
	 * Present when the form was opened from a lead conversion. When the lead
	 * already has an owner (`businessAgent` resolved server-side from
	 * `Lead.idUser`), the `agent` field defaults to that owner and is locked
	 * — the Money Strategist responsible for the lead stays responsible for
	 * the resulting business.
	 */
	leadId?: number
}

/**
 * Convierte AgentInfo a UserWithRole para uso en el formulario
 * Crea un objeto parcial compatible con UserWithRole
 */
function agentInfoToUserWithRole(agentInfo: AgentInfo): UserWithRole {
	// Dividir fullName en name y lastName
	const nameParts = agentInfo.fullName.split(' ')
	const name = nameParts[0] || ''
	const lastName = nameParts.slice(1).join(' ') || null

	return {
		id: agentInfo.id,
		idUser: agentInfo.id,
		name,
		lastName,
		email: agentInfo.email,
		phone: agentInfo.phone,
		identityNumber: null, // No disponible en AgentInfo
		active: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		role: agentInfo.roleName
			? {
					id: 0,
					idRole: 0, // No disponible en AgentInfo
					code: UserRole.AGENTE, // Asumimos que es agente
					name: agentInfo.roleName,
					createdAt: new Date(),
					updatedAt: new Date(),
				}
			: null,
	} as UserWithRole
}

/**
 * Hook para manejar permisos y roles de usuario relacionados con agentes
 * Centraliza la lógica de autorización y pre-carga el agente actual si es AGENTE
 * En modo edición, carga el agente asignado al negocio
 */
export function useAgentPermissions({
	currentUser,
	setValue,
	mode = 'create',
	businessAgent,
	leadId,
}: UseAgentPermissionsOptions) {
	const [agentsList, setAgentsList] = React.useState<UserWithRole[]>([])

	// Determinar si el usuario es AGENTE
	const isAgentUser = currentUser?.role?.code === UserRole.AGENTE

	// Determinar si el usuario puede buscar agentes
	const canSearchAgents =
		currentUser?.role?.code === UserRole.ANALISTA_SOPORTE ||
		currentUser?.role?.code === UserRole.ASISTENTE_GERENCIA_OPERATIVA ||
		currentUser?.role?.code === UserRole.ADMIN

	// Conversión de lead con owner ya asignado: el campo `agent` se bloquea
	// y se fija al owner del lead. Nunca aplica en edición (ahí el agente
	// asignado al negocio ya es inmutable por otra vía — COM-63).
	const isLeadOwnerLocked = Boolean(
		mode === 'create' && leadId && businessAgent
	)

	// Pre-cargar el usuario actual si es AGENTE y establecer el valor del formulario
	React.useEffect(() => {
		if (isAgentUser && currentUser) {
			setValue('agent', currentUser.idUser.toString(), {
				shouldValidate: true,
			})
		}
	}, [isAgentUser, currentUser, setValue])

	// Conversión de lead con owner: fija el campo al owner, sobrescribiendo
	// cualquier auto-asignación anterior (p. ej. si el usuario actual también
	// es AGENTE) — el owner del lead siempre gana.
	React.useEffect(() => {
		if (isLeadOwnerLocked && businessAgent) {
			setValue('agent', businessAgent.id.toString(), {
				shouldValidate: true,
			})
		}
	}, [isLeadOwnerLocked, businessAgent, setValue])

	// Cargar agentes en la lista: usuario actual si es AGENTE, y agente del
	// negocio en modo edición o cuando el lead ya trae un owner asignado
	React.useEffect(() => {
		const agents: UserWithRole[] = []

		// Agregar usuario actual si es AGENTE
		if (isAgentUser && currentUser) {
			agents.push(currentUser)
		}

		if ((mode === 'edit' || isLeadOwnerLocked) && businessAgent) {
			const agentUser = agentInfoToUserWithRole(businessAgent)
			// Evitar duplicados
			const exists = agents.some((agent) => agent.idUser === agentUser.idUser)
			if (!exists) {
				agents.push(agentUser)
			}
		}

		setAgentsList(agents)
	}, [mode, businessAgent, isAgentUser, currentUser, isLeadOwnerLocked])

	return {
		agentsList,
		setAgentsList,
		isAgentUser,
		canSearchAgents,
		isLeadOwnerLocked,
	}
}
